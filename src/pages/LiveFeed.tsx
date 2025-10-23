import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { useToast } from "@/hooks/use-toast";
import { Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LiveFeedCard } from "@/components/feed/LiveFeedCard";
import { CreateLiveFeedDialog } from "@/components/feed/CreateLiveFeedDialog";
import { useLiveFeedNotifications } from "@/hooks/useLiveFeedNotifications";
import "@/styles/mobile-fixes.css";

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
  const { markAsRead } = useLiveFeedNotifications();

  const fetchLiveFeed = async () => {
    try {
      // First get live feed items
      const { data: feedData, error } = await supabase
        .from("live_feed")
        .select(
          `
          *,
          profiles(
            full_name,
            avatar_url
          )
        `
        )
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get current user
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      // Get user's profile ID first
      let userProfileId = null;
      if (currentUser) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", currentUser.id)
          .single();
        userProfileId = profile?.id;
      }

      // Get like counts, comment counts, and user likes for each item
      const itemsWithLikes = await Promise.all(
        (feedData || []).map(async (item) => {
          const [
            { count: likeCount },
            { count: commentCount },
            { data: userLikes },
          ] = await Promise.all([
            supabase
              .from("live_feed_likes")
              .select("*", { count: "exact", head: true })
              .eq("live_feed_id", item.id),
            supabase
              .from("live_feed_comments")
              .select("*", { count: "exact", head: true })
              .eq("live_feed_id", item.id),
            currentUser
              ? supabase
                  .from("live_feed_likes")
                  .select("user_id")
                  .eq("live_feed_id", item.id)
                  .eq("user_id", currentUser.id)
              : Promise.resolve({ data: [] }),
          ]);

          console.log(
            `Item ${item.id}: likeCount=${likeCount}, userLikes=`,
            userLikes,
            `user.id=${currentUser?.id}`
          );

          return {
            ...item,
            live_feed_likes: [{ count: likeCount || 0 }],
            live_feed_comments: [{ count: commentCount || 0 }],
            user_liked: userLikes || [],
            is_owner: userProfileId === item.seller_id,
          };
        })
      );

      // Sort items: user's posts first, then by created_at
      const sortedItems = itemsWithLikes.sort((a, b) => {
        if (a.is_owner && !b.is_owner) return -1;
        if (!a.is_owner && b.is_owner) return 1;

        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setItems(sortedItems);
    } catch (error: any) {
      console.error("Live feed fetch error:", error);
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
    // Mark live feed as read when page is opened
    markAsRead();

    // Set up real-time subscriptions
    const subscription = supabase
      .channel("live_feed_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_feed" },
        () => {
          fetchLiveFeed();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_feed_likes" },
        () => {
          fetchLiveFeed();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_feed_comments" },
        () => {
          fetchLiveFeed();
        }
      )
      .subscribe();

    // Auto-refresh every minute to update time remaining
    const interval = setInterval(() => {
      setItems((prev) =>
        prev.filter((item) => new Date(item.expires_at) > new Date())
      );
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
          .from("profiles")
          .select("account_type, seller_status")
          .eq("user_id", user.id)
          .single();
        setUserProfile(data);
      }
    };
    fetchUserProfile();
  }, [user]);

  const canPost =
    userProfile?.account_type === "seller" &&
    userProfile?.seller_status === "approved";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 pb-24 md:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              Live Feed
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              ⚡ Quick deals that expire in 24 hours
            </p>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLiveFeed}
              disabled={loading}
              className="rounded-xl border-2 border-gray-200 hover:border-university-green"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>

            {canPost && (
              <CreateLiveFeedDialog onSuccess={fetchLiveFeed}>
                <Button className="rounded-xl px-6 bg-university-green hover:bg-university-green/90">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Post Live</span>
                  <span className="sm:hidden">Post</span>
                </Button>
              </CreateLiveFeedDialog>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-lg border-0 overflow-hidden animate-pulse"
              >
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200" />
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded-full w-24" />
                      <div className="h-2 bg-gray-200 rounded-full w-16" />
                    </div>
                  </div>
                </div>
                <div className="aspect-square bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-200 rounded-full w-full" />
                  <div className="flex gap-4 pt-2">
                    <div className="h-8 bg-gray-200 rounded-full w-16" />
                    <div className="h-8 bg-gray-200 rounded-full w-16" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="w-20 h-20 bg-university-green/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus className="h-10 w-10 text-university-green" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              No live items yet
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {canPost
                ? "Be the first to post a quick deal and watch it go viral!"
                : "Check back soon for amazing quick deals from sellers"}
            </p>
            {canPost && (
              <CreateLiveFeedDialog onSuccess={fetchLiveFeed}>
                <Button className="rounded-xl px-8 py-3 text-base font-medium bg-university-green hover:bg-university-green/90">
                  <Plus className="h-5 w-5 mr-2" />
                  Post Your First Item
                </Button>
              </CreateLiveFeedDialog>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {items.map((item) => (
              <LiveFeedCard
                key={item.id}
                item={item}
                onDelete={fetchLiveFeed}
                onRefresh={fetchLiveFeed}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveFeed;
