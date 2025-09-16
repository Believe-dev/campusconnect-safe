import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { SAFE_PROFILE_SELECT } from '@/lib/profileSecurity';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Shield, AlertTriangle, MessageCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
    
    // Set up real-time messaging
    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        }, 
        async (payload) => {
          const newMsg = payload.new as Message;
          
          // Fetch sender profile for the new message
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', newMsg.sender_id)
            .maybeSingle();
          
          const messageWithSender = {
            ...newMsg,
            sender: profile
          };
          
          setMessages(prev => [...prev, messageWithSender]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

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
      /\d{11}/g, // Phone numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email addresses
      /\b\d{10}\b/g, // Bank account numbers (simplified)
      /whatsapp|telegram|instagram|facebook|twitter/gi, // Social media
      /contact me|call me|text me|dm me/gi, // Direct contact phrases
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

    setLoading(true);

    try {
      // Use the moderation edge function for advanced content filtering
      const { data, error } = await supabase.functions.invoke('moderate-message', {
        body: {
          message: newMessage.trim(),
          conversationId: conversationId,
          senderId: currentUserId
        }
      });

      if (error) {
        console.error('Error calling moderation function:', error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if message was blocked by moderation
      if (data && !data.allowed) {
        toast({
          title: "Message Blocked",
          description: "Your message contains prohibited content. Please keep all communication within UniMarket for your safety.",
          variant: "destructive",
        });
        setBlocked(true);
        setTimeout(() => setBlocked(false), 3000);
        return;
      }

      // Message was approved and sent
      setNewMessage('');
      toast({
        title: "Message Sent",
        description: "Your message has been delivered successfully.",
      });
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
    <Card className="flex flex-col h-[600px] max-w-2xl mx-auto shadow-card">
      <CardHeader className="border-b px-3 py-4 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-university-green flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <CardTitle className="text-sm sm:text-lg truncate">
                {conversation?.product?.title || 'Secure Chat'}
              </CardTitle>
              {conversation?.product?.price && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  ₦{conversation.product.price.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-xs px-1 sm:px-2 py-1">
              <Shield className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
              <span className="hidden sm:inline">Monitored</span>
              <span className="sm:hidden">Safe</span>
            </Badge>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                ✕
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm sm:text-base">Start the conversation!</p>
                <p className="text-xs mt-1">All messages are monitored for your safety</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 sm:gap-3 ${
                    message.sender_id === currentUserId ? 'flex-row-reverse' : ''
                  }`}
                >
                  <a href={`/seller/${message.sender_id}`}>
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0">
                      <AvatarImage src={message.sender?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {message.sender?.full_name 
                          ? getInitials(message.sender.full_name)
                          : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </a>
                  
                  <div className="flex flex-col">
                    <div
                      className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-2 sm:px-3 py-2 rounded-lg group relative ${
                        message.sender_id === currentUserId
                          ? 'bg-university-green text-white'
                          : 'bg-muted'
                      }`}
                    >
                      {message.is_flagged && (
                        <div className="flex items-center gap-1 text-xs text-warning mb-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="hidden sm:inline">Flagged: {message.flagged_reason}</span>
                          <span className="sm:hidden">Flagged</span>
                        </div>
                      )}
                      <p className="text-sm break-words">{message.content}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p
                          className={`text-xs ${
                            message.sender_id === currentUserId
                              ? 'text-white/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {formatTime(message.created_at)}
                        </p>
                        {message.sender_id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMessage(message.id)}
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20 hover:text-destructive ml-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Security Notice */}
          {blocked && (
            <div className="mx-3 sm:mx-4 mb-2 p-2 sm:p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-start gap-2 text-destructive text-xs sm:text-sm">
                <Shield className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                <span>
                  Contact information sharing is prohibited. Please keep all communication within UniMarket for your safety.
                </span>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="border-t p-3 sm:p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-1 text-sm"
              />
              <Button
                variant="marketplace"
                size="icon"
                onClick={sendMessage}
                disabled={loading || !newMessage.trim()}
                className="h-9 w-9 sm:h-10 sm:w-10"
              >
                <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Shield className="h-3 w-3 flex-shrink-0" />
              <span className="hidden sm:inline">All messages are monitored. Sharing contact info is prohibited for your safety.</span>
              <span className="sm:hidden">Messages monitored for safety</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecureChat;