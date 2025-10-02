import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { useToast } from '@/hooks/use-toast';
import { Plus, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { LiveFeedCard } from '@/components/feed/LiveFeedCard';
import { CreateLiveFeedDialog } from '@/components/feed/CreateLiveFeedDialog';
import Header from '@/components/layout/Header';

interface LiveFeedItem {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  location: string;
  expires_at: string;
  created_at: string;
  is_active: boolean;
  is_owner?: boolean;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
  live_feed_likes?: { count: number }[];
  live_feed_comments?: { count: number }[];
  user_liked?: { user_id: string }[];
}

const LiveFeed = () => {
  const [items, setItems] = useState<LiveFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchLiveFeed = async () => {
    try {
      // First get live feed items
      const { data: feedData, error } = await supabase
        .from('live_feed')
        .select(`
          *,
          profiles(
            full_name,
            avatar_url
          )
        `)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      // Get user's profile ID first
      let userProfileId = null;
      if (currentUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();
        userProfileId = profile?.id;
      }

      // Get like counts, comment counts, and user likes for each item
      const itemsWithLikes = await Promise.all(
        (feedData || []).map(async (item) => {
          const [{ count: likeCount }, { count: commentCount }, { data: userLikes }] = await Promise.all([
            supabase
              .from('live_feed_likes')
              .select('*', { count: 'exact', head: true })
              .eq('live_feed_id', item.id),
            supabase
              .from('live_feed_comments')
              .select('*', { count: 'exact', head: true })
              .eq('live_feed_id', item.id),
            currentUser ? supabase
              .from('live_feed_likes')
              .select('user_id')
              .eq('live_feed_id', item.id)
              .eq('user_id', currentUser.id) : Promise.resolve({ data: [] })
          ]);

          console.log(`Item ${item.id}: likeCount=${likeCount}, userLikes=`, userLikes, `user.id=${currentUser?.id}`);
          
          return {
            ...item,
            live_feed_likes: [{ count: likeCount || 0 }],
            live_feed_comments: [{ count: commentCount || 0 }],
            user_liked: userLikes || [],
            is_owner: userProfileId === item.seller_id
          };
        })
      );
      
      // Sort items: user's posts first, then by created_at
      const sortedItems = itemsWithLikes.sort((a, b) => {
        if (a.is_owner && !b.is_owner) return -1;
        if (!a.is_owner && b.is_owner) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setItems(sortedItems);
    } catch (error: any) {
      console.error('Live feed fetch error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load live feed",
        variant: "destructive",
      });
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveFeed();

    // Set up real-time subscriptions
    const subscription = supabase
      .channel('live_feed_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'live_feed' },
        () => {
          fetchLiveFeed();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'live_feed_likes' },
        () => {
          fetchLiveFeed();
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'live_feed_comments' },
        () => {
          fetchLiveFeed();
        }
      )
      .subscribe();

    // Auto-refresh every minute to update time remaining
    const interval = setInterval(() => {
      setItems(prev => prev.filter(item => new Date(item.expires_at) > new Date()));
    }, 60000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);



  // Check if user can post - need to get profile data
  const [userProfile, setUserProfile] = useState<any>(null);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('account_type, seller_status')
          .eq('user_id', user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchUserProfile();
  }, [user]);
  
  const canPost = userProfile?.account_type === 'seller' && userProfile?.seller_status === 'approved';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Feed</h1>
            <p className="text-gray-600">Quick deals that expire in 24 hours</p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchLiveFeed}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            
            {canPost && (
              <CreateLiveFeedDialog onSuccess={fetchLiveFeed}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Live
                </Button>
              </CreateLiveFeedDialog>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden animate-pulse">
                <div className="h-1 bg-gray-200" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <div className="space-y-1">
                      <div className="h-3 bg-gray-200 rounded w-20" />
                      <div className="h-2 bg-gray-200 rounded w-16" />
                    </div>
                  </div>
                </div>
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No live items yet</h3>
            <p className="text-gray-600 mb-4">
              {canPost 
                ? "Be the first to post a quick deal!" 
                : "Check back soon for quick deals from sellers"
              }
            </p>
            {canPost && (
              <CreateLiveFeedDialog onSuccess={fetchLiveFeed}>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Post Your First Item
                </Button>
              </CreateLiveFeedDialog>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <LiveFeedCard
                key={item.id}
                item={item}
                onDelete={fetchLiveFeed}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveFeed;