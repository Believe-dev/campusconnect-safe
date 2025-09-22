import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMessagesCount } from '@/hooks/useMessagesCount';
import { MessageCircle, Plus, Shield, Trash2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import SecureChat from '@/components/chat/SecureChat';

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id?: string;
  created_at: string;
  product?: {
    title: string;
    price: number;
  };
  other_user?: {
    full_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
}

export default function Messages() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get('conversation')
  );
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversationForAction, setSelectedConversationForAction] = useState<string | null>(null);
  const { toast } = useToast();
  const { messagesCount } = useMessagesCount();

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (selectedConversation) {
        setSelectedConversation(null);
        window.history.pushState(null, '', '/messages');
      }
    };

    if (selectedConversation) {
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Optimized real-time subscription for high concurrent users
      const channel = supabase
        .channel(`messages_user_${user.id}`, {
          config: {
            broadcast: { self: false },
            presence: { key: user.id }
          }
        })
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=in.(${conversations.map(c => c.id).join(',')})`
          },
          (payload) => {
            const newMessage = payload.new;
            // Only update if message affects this user's conversations
            setConversations(prev => prev.map(conv => {
              if (conv.id === newMessage.conversation_id) {
                return {
                  ...conv,
                  last_message: {
                    content: newMessage.content,
                    created_at: newMessage.created_at,
                    sender_id: newMessage.sender_id
                  },
                  unread_count: newMessage.sender_id !== user.id 
                    ? (conv.unread_count || 0) + 1 
                    : conv.unread_count
                };
              }
              return conv;
            }));
          }
        )
        .on('postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            // Update unread count when messages are marked as read
            if (payload.new.is_read === true && payload.old?.is_read !== true) {
              setConversations(prev => prev.map(conv => {
                if (conv.id === payload.new.conversation_id) {
                  return {
                    ...conv,
                    unread_count: Math.max(0, (conv.unread_count || 0) - 1)
                  };
                }
                return conv;
              }));
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user, conversations.length]); // Add conversations.length to dependency

  const fetchConversations = async () => {
    if (!user?.id) {
      setLoadingConversations(false);
      return;
    }

    try {
      // Single optimized query with joins
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id, buyer_id, seller_id, product_id, created_at,
          products (title, price),
          buyer:profiles!conversations_buyer_id_fkey (full_name, avatar_url),
          seller:profiles!conversations_seller_id_fkey (full_name, avatar_url)
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (error) throw error;

      if (!data || data.length === 0) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      // Get all conversation IDs for batch queries
      const convIds = data.map(c => c.id);
      
      // Batch fetch last messages
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_id')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

      // Get unread counts - only count unread messages
      const unreadCounts = {};
      for (const convId of convIds) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convId)
          .neq('sender_id', user.id)
          .or('is_read.is.null,is_read.eq.false');
        unreadCounts[convId] = count || 0;
      }

      // Process conversations
      const processedConversations = data.map(conv => {
        const otherUser = conv.buyer_id === user.id ? conv.seller : conv.buyer;
        const lastMsg = lastMessages?.find(m => m.conversation_id === conv.id);
        const unreadCount = unreadCounts[conv.id] || 0;
        
        console.log(`Conversation ${conv.id}: unread count = ${unreadCount}`);
        
        return {
          ...conv,
          other_user: otherUser,
          last_message: lastMsg,
          unread_count: unreadCount,
          product: conv.products
        };
      });

      // Sort by last message time
      processedConversations.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(processedConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      toast({
        title: "Conversation Deleted",
        description: "The conversation has been deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation. Please try again.",
        variant: "destructive",
      });
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

  if (loading || loadingConversations) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading messages...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }



  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pb-20 max-w-4xl">
        {/* Security Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Secure Messages</h1>
              <p className="text-sm text-muted-foreground">End-to-end encrypted conversations</p>
            </div>
          </div>
          {messagesCount > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {messagesCount} unread
            </Badge>
          )}
        </div>

        {/* Messages Container */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-0">
            {loadingConversations ? (
              <div className="p-6">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-3 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6">
                <div className="p-4 bg-muted/50 rounded-full mb-4">
                  <MessageCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-sm">
                  Start secure conversations with sellers when you're interested in their products
                </p>
                <Button asChild>
                  <a href="/marketplace">
                    <Plus className="h-4 w-4 mr-2" />
                    Browse Products
                  </a>
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {conversations.map((conversation) => (
                  <div 
                    key={conversation.id} 
                    className="group relative hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/chat/${conversation.id}`)}
                    onTouchStart={(e) => {
                      const timer = setTimeout(() => {
                        setSelectedConversationForAction(conversation.id);
                        navigator.vibrate?.(50);
                      }, 500);
                      e.currentTarget.dataset.timer = timer.toString();
                    }}
                    onTouchEnd={(e) => {
                      const timer = e.currentTarget.dataset.timer;
                      if (timer) clearTimeout(parseInt(timer));
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setSelectedConversationForAction(conversation.id);
                    }}
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="relative flex-shrink-0">
                        <Avatar 
                          className="h-12 w-12 border-2 border-background shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            const otherUserId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id;
                            window.location.href = `/seller/${otherUserId}`;
                          }}
                        >
                          <AvatarImage src={conversation.other_user?.avatar_url} />
                          <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                            {conversation.other_user?.full_name 
                              ? getInitials(conversation.other_user.full_name)
                              : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.unread_count > 0 && (
                          <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 text-xs font-bold shadow-lg border-2 border-background">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                          </div>
                        )}
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                      </div>
                      
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">
                              {conversation.other_user?.full_name || 'Anonymous User'}
                            </h3>
                            {conversation.other_user?.is_verified && (
                              <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                          {conversation.last_message && (
                            <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {formatTime(conversation.last_message.created_at)}
                            </span>
                          )}
                        </div>
                        
                        {conversation.product && (
                          <div className="flex items-center gap-2 mb-1 overflow-hidden">
                            <Badge variant="outline" className="text-xs px-2 py-0 truncate max-w-[120px]">
                              Product Discussion
                            </Badge>
                          </div>
                        )}
                        
                        <p className={`text-sm truncate flex items-center gap-1 ${
                          conversation.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                        }`}>
                          {conversation.last_message ? (
                            <>
                              {conversation.last_message.sender_id === user.id && (
                                <span className="text-blue-500 flex-shrink-0">✓</span>
                              )}
                              <span className="truncate">
                                {conversation.last_message.sender_id === user.id ? 'You: ' : ''}
                                {conversation.last_message.content}
                              </span>
                            </>
                          ) : (
                            <span className="italic text-muted-foreground">Start secure conversation</span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Shield className="h-4 w-4 text-green-500" />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
                          onClick={(e) => deleteConversation(conversation.id, e)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      
      {/* Conversation Actions Modal */}
      {selectedConversationForAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setSelectedConversationForAction(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-300" onClick={(e) => e.stopPropagation()}>

            <h3 className="font-bold text-lg text-center mb-6 text-gray-800">Conversation Actions</h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start h-12 text-left border-gray-200 hover:bg-gray-50 transition-all duration-200" onClick={async () => {
                try {
                  const { error } = await supabase
                    .from('messages')
                    .delete()
                    .eq('conversation_id', selectedConversationForAction);
                  
                  if (error) throw error;
                  
                  toast({ title: "✅ Chat Cleared", description: "All messages have been cleared" });
                  fetchConversations();
                } catch (error) {
                  toast({ title: "❌ Error", description: "Failed to clear chat", variant: "destructive" });
                }
                setSelectedConversationForAction(null);
              }}>
                <span className="text-lg mr-3">🧹</span>
                <span className="font-medium">Clear Chat</span>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12 text-left border-red-200 text-red-600 hover:bg-red-50 transition-all duration-200" onClick={(e) => {
                deleteConversation(selectedConversationForAction, e);
                setSelectedConversationForAction(null);
              }}>
                <span className="text-lg mr-3">🗑️</span>
                <span className="font-medium">Delete Conversation</span>
              </Button>
            </div>
            <Button variant="ghost" className="w-full mt-4 h-12 font-medium text-gray-600" onClick={() => setSelectedConversationForAction(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}