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
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => [...prev, newMsg]);
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

    // Check for blocked content
    const flaggedReason = detectBlockedContent(newMessage);
    if (flaggedReason) {
      toast({
        title: "Message Blocked",
        description: "Your message contains prohibited contact information. Please keep all communication within UniMarket for your safety.",
        variant: "destructive",
      });
      setBlocked(true);
      setTimeout(() => setBlocked(false), 3000);
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: newMessage.trim(),
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error in sendMessage:', error);
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

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="flex flex-col h-[600px] max-w-2xl mx-auto">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-5 w-5 text-university-green" />
            <div>
              <CardTitle className="text-lg">
                {conversation?.product?.title || 'Secure Chat'}
              </CardTitle>
              {conversation?.product?.price && (
                <p className="text-sm text-muted-foreground">
                  ₦{conversation.product.price.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Monitored
            </Badge>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                ✕
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-0">
        <div className="h-full flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Start the conversation!</p>
                <p className="text-xs mt-1">All messages are monitored for your safety</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.sender_id === currentUserId ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.sender?.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {message.sender?.full_name 
                        ? getInitials(message.sender.full_name)
                        : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                      message.sender_id === currentUserId
                        ? 'bg-university-green text-white'
                        : 'bg-muted'
                    }`}
                  >
                    {message.is_flagged && (
                      <div className="flex items-center gap-1 text-xs text-warning mb-1">
                        <AlertTriangle className="h-3 w-3" />
                        Flagged: {message.flagged_reason}
                      </div>
                    )}
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender_id === currentUserId
                          ? 'text-white/70'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Security Notice */}
          {blocked && (
            <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-center gap-2 text-destructive text-sm">
                <Shield className="h-4 w-4" />
                <span>
                  Contact information sharing is prohibited. Please keep all communication within UniMarket for your safety.
                </span>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Input
                placeholder="Type a message... (monitored for safety)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="flex-1"
              />
              <Button
                variant="marketplace"
                size="icon"
                onClick={sendMessage}
                disabled={loading || !newMessage.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              All messages are monitored. Sharing contact info is prohibited for your safety.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecureChat;