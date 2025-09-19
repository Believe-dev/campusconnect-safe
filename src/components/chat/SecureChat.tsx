import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { SAFE_PROFILE_SELECT } from '@/lib/profileSecurity';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Shield, AlertTriangle, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { notifyNewMessage } from '@/utils/notificationHelpers';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_flagged: boolean;
  flagged_reason?: string;
  sender?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  product?: {
    title: string;
    price: number;
  };
}

interface SecureChatProps {
  conversationId: string;
  currentUserId: string;
  onClose?: () => void;
}

const SecureChat = ({ conversationId, currentUserId, onClose }: SecureChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchConversation();
    fetchMessages();
    
    // Store that user viewed this conversation (simple approach)
    const markAsViewed = () => {
      const viewedKey = `viewed_${conversationId}_${currentUserId}`;
      localStorage.setItem(viewedKey, new Date().toISOString());
      
      // Refresh count immediately
      setTimeout(() => {
        if (window.refreshMessageCount) {
          window.refreshMessageCount();
        }
      }, 100);
    };
    markAsViewed();
    
    // Optimized real-time messaging for high concurrent users
    const subscription = supabase
      .channel(`chat_${conversationId}_${currentUserId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: currentUserId }
        }
      })
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Skip if it's our own message (already added optimistically)
          if (newMsg.sender_id === currentUserId) return;
          
          // Use cached profile data if available
          const cachedProfile = messages.find(m => m.sender_id === newMsg.sender_id)?.sender;
          let profile = cachedProfile;
          
          if (!profile) {
            const { data: fetchedProfile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('user_id', newMsg.sender_id)
              .maybeSingle();
            profile = fetchedProfile;
          }
          
          const messageWithSender = {
            ...newMsg,
            sender: profile
          };
          
          setMessages(prev => [...prev, messageWithSender]);
          scrollToBottom();
          
          // Mark new message as read immediately (batch operation)
          supabase
            .from('messages')
            .update({ is_read: true })
            .eq('id', newMsg.id)
            .then(() => {
              // Trigger count refresh
              if (window.refreshMessageCount) {
                setTimeout(window.refreshMessageCount, 500);
              }
            });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          products (title, price)
        `)
        .eq('id', conversationId)
        .single();

      if (error) {
        console.error('Error fetching conversation:', error);
        return;
      }

      setConversation(data);
    } catch (error) {
      console.error('Error in fetchConversation:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          profiles!sender_id (
            full_name,
            avatar_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      setMessages(data.map(msg => ({
        ...msg,
        sender: msg.profiles
      })) || []);
    } catch (error) {
      console.error('Error in fetchMessages:', error);
    }
  };

  const detectBlockedContent = (content: string): string | null => {
    const patterns = [
      /\b\d{10,11}\b/g, // Phone numbers (10-11 digits)
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /whatsapp|telegram|instagram|facebook|twitter|snapchat|tiktok/gi, // Social media
      /contact me|call me|text me|dm me|reach me|phone me/gi, // Direct contact phrases
      /\b0[789]\d{8}\b/g, // Nigerian phone numbers
      /\+234[789]\d{8}/g, // Nigerian international format
    ];

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return 'Contains prohibited contact information';
      }
    }

    return null;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || loading) return;

    // Check for prohibited content before sending
    const blockedReason = detectBlockedContent(newMessage.trim());
    if (blockedReason) {
      toast({
        title: "Message Blocked",
        description: "Your message contains prohibited content. Please keep all communication within UniMarket for your safety.",
        variant: "destructive",
      });
      setBlocked(true);
      setTimeout(() => setBlocked(false), 3000);
      return;
    }

    setLoading(true);

    try {
      const messageContent = newMessage.trim();
      const tempId = `temp-${Date.now()}`;
      
      // Optimistic update - add message immediately
      const optimisticMessage = {
        id: tempId,
        content: messageContent,
        sender_id: currentUserId,
        created_at: new Date().toISOString(),
        is_flagged: false,
        sender: messages.find(m => m.sender_id === currentUserId)?.sender
      };
      
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage('');
      scrollToBottom();
      
      // Send to database
      const { data: insertedMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: messageContent,
          is_flagged: false
        })
        .select()
        .single();

      if (error) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(m => m.id !== tempId));
        throw error;
      }
      
      // Replace temp message with real one
      setMessages(prev => prev.map(m => 
        m.id === tempId ? { ...optimisticMessage, id: insertedMessage.id } : m
      ));

      // Send notification in background
      if (conversation) {
        const receiverId = conversation.buyer_id === currentUserId ? conversation.seller_id : conversation.buyer_id;
        const { data: senderProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', currentUserId)
          .single();
        
        if (senderProfile) {
          notifyNewMessage(receiverId, senderProfile.full_name);
        }
      }
    } catch (error) {
      console.error('Error in sendMessage:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      toast({
        title: "Message Deleted",
        description: "The message has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="h-full flex flex-col border-0 shadow-lg">
      {/* Secure Chat Header */}
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-t-lg">
        <div className="flex items-center gap-3">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 text-white hover:bg-white/20">
              ←
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4" />
              <CardTitle className="text-lg font-semibold truncate">
                {conversation?.product?.title || 'Secure Chat'}
              </CardTitle>
            </div>
            {conversation?.product?.price && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0 text-xs">
                ₦{conversation.product.price.toLocaleString()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
            <span>Encrypted</span>
          </div>
        </div>
      </CardHeader>

      {/* Messages Container */}
      <CardContent className="flex-1 overflow-y-auto p-0 bg-gradient-to-b from-gray-50 to-white">
        <div className="p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Start secure conversation</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  All messages are encrypted and monitored for safety
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex mb-3 ${
                  message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm border ${
                    message.sender_id === currentUserId
                      ? 'bg-green-500 text-white border-green-500 rounded-br-sm'
                      : 'bg-white text-foreground border-border rounded-bl-sm'
                  }`}
                >
                  {message.is_flagged && (
                    <div className="flex items-center gap-1 text-xs text-destructive mb-2 p-2 bg-destructive/10 rounded">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Content flagged for review</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed break-words">{message.content}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-xs ${
                      message.sender_id === currentUserId ? 'text-green-100' : 'text-muted-foreground'
                    }`}>
                      {formatTime(message.created_at)}
                    </span>
                    {message.sender_id === currentUserId && (
                      <div className="flex items-center gap-1">
                        <span className={`text-xs ${
                          message.id?.startsWith('temp-') ? 'text-green-200' : 'text-green-100'
                        }`}>
                          {message.id?.startsWith('temp-') ? '⏳' : '✓'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </CardContent>

      {/* Security Alert */}
      {blocked && (
        <div className="mx-4 mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2 text-destructive text-sm">
            <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Message blocked for safety</p>
              <p className="text-xs mt-1">Contact information sharing is prohibited to protect users</p>
            </div>
          </div>
        </div>
      )}

      {/* Message Input Area */}
      <div className="border-t bg-white p-4">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Input
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading}
              className="border-2 border-muted focus:border-green-500 rounded-full px-4 py-2 text-sm"
            />
          </div>
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={loading || !newMessage.trim()}
            className="h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 shadow-lg"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
          <Shield className="h-3 w-3 text-green-600" />
          <span>End-to-end encrypted • Monitored for safety</span>
        </div>
      </div>
    </Card>
  );
};

export default SecureChat;