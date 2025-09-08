import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Plus, Shield, Trash2 } from 'lucide-react';
import Header from '@/components/layout/Header';
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
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
}

export default function Messages() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    searchParams.get('conversation')
  );
  const [loadingConversations, setLoadingConversations] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Set up real-time subscription for new conversations
      const subscription = supabase
        .channel('conversations_changes')
        .on('postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'conversations',
            filter: `buyer_id=eq.${user.id},seller_id=eq.${user.id}` 
          },
          () => {
            fetchConversations(); // Refetch when new conversation is created
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          products (title, price),
          messages (content, created_at, sender_id)
        `)
        .or(`buyer_id.eq.${user?.id},seller_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Process conversations to get other user info and last message
      const processedConversations = await Promise.all(data.map(async (conv) => {
        const otherUserId = conv.buyer_id === user?.id ? conv.seller_id : conv.buyer_id;
        
        // Get other user's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('user_id', otherUserId)
          .maybeSingle();

        // Get last message
        const lastMessage = conv.messages && conv.messages.length > 0 
          ? conv.messages[conv.messages.length - 1] 
          : null;

        return {
          ...conv,
          other_user: profile,
          last_message: lastMessage,
          product: conv.products
        };
      }));

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

  if (selectedConversation) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-8">
          <SecureChat 
            conversationId={selectedConversation} 
            currentUserId={user.id}
            onClose={() => setSelectedConversation(null)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-2 py-4 sm:px-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">Messages</h1>
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" />
              Secure
            </Badge>
          </div>
        </div>

        {conversations.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 sm:py-12">
              <MessageCircle className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No conversations yet</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Start a conversation with sellers by messaging them about their products
              </p>
              <Button variant="default" asChild>
                <a href="/marketplace">Browse Products</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-4">
            {conversations.map((conversation) => (
              <Card 
                key={conversation.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedConversation(conversation.id)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-4">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 flex-shrink-0">
                      <AvatarImage src={conversation.other_user?.avatar_url} />
                      <AvatarFallback className="bg-university-green text-white text-xs sm:text-sm">
                        {conversation.other_user?.full_name 
                          ? getInitials(conversation.other_user.full_name)
                          : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="font-semibold text-sm sm:text-base truncate pr-2">
                          {conversation.other_user?.full_name || 'Anonymous User'}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {conversation.last_message && (
                            <span className="text-xs text-muted-foreground">
                              {formatTime(conversation.last_message.created_at)}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => deleteConversation(conversation.id, e)}
                            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {conversation.product && (
                        <p className="text-xs sm:text-sm text-muted-foreground mb-1 truncate">
                          About: {conversation.product.title} - ₦{conversation.product.price.toLocaleString()}
                        </p>
                      )}
                      
                      {conversation.last_message ? (
                        <p className="text-sm text-muted-foreground truncate">
                          {conversation.last_message.sender_id === user.id ? 'You: ' : ''}
                          {conversation.last_message.content}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No messages yet</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}