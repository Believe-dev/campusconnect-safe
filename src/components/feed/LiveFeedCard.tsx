import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { LiveFeedCommentsSheet } from "@/components/feed/LiveFeedCommentsSheet";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  Eye,
  ShoppingBag,
  Heart,
  User,
  MessageSquare,
  Trash2,
  MapPin,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { findOrCreateConversation } from "@/utils/conversationUtils";
import { createIntersectionObserver } from "@/lib/performance";

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
    user_id: string;
    is_verified?: boolean;
  };
  live_feed_likes?: { count: number }[];
  live_feed_comments?: { count: number }[];
  live_feed_views?: { count: number }[];
  user_liked?: { user_id: string }[];
}

interface LiveFeedCardProps {
  item: LiveFeedItem;
  onDelete?: () => void;
  onRefresh?: () => void;
}

export const LiveFeedCard = ({
  item,
  onDelete,
  onRefresh,
}: LiveFeedCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  // Use the is_owner flag from the item
  const isOwner = item.is_owner || false;

  useEffect(() => {
    // Set like status from database data
    const isLiked = item.user_liked && item.user_liked.length > 0;
    setLiked(isLiked);
    setLikeCount(item.live_feed_likes?.[0]?.count || 0);
    setCommentCount(item.live_feed_comments?.[0]?.count || 0);
    setViewCount(item.live_feed_views?.[0]?.count || 0);
  }, [
    item.id,
    item.user_liked,
    item.live_feed_likes,
    item.live_feed_comments,
    item.live_feed_views,
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Records a view once the card is actually visible in the feed, not just
  // mounted (a card several screens below the fold shouldn't count as
  // "seen"). Deduped server-side via a unique(live_feed_id, user_id)
  // constraint, so this only ever needs to fire once per viewer per post.
  useEffect(() => {
    if (!user || isOwner || !cardRef.current) return;

    const observer = createIntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          supabase
            .from("live_feed_views")
            .upsert(
              { live_feed_id: item.id, user_id: user.id },
              { onConflict: "live_feed_id,user_id", ignoreDuplicates: true }
            )
            .then(({ error }) => {
              if (error) console.error("Error recording view:", error);
            });
          observer?.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer?.observe(cardRef.current);
    return () => observer?.disconnect();
  }, [user, isOwner, item.id]);

  const handleSellerClick = async () => {
    const { data: sellerProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("id", item.seller_id)
      .single();

    if (sellerProfile) {
      navigate(`/seller/${sellerProfile.user_id}`);
    }
  };

  const totalDurationMs =
    new Date(item.expires_at).getTime() - new Date(item.created_at).getTime();
  const remainingMs = new Date(item.expires_at).getTime() - currentTime.getTime();
  const percentRemaining =
    totalDurationMs > 0
      ? Math.max(0, Math.min(100, (remainingMs / totalDurationMs) * 100))
      : 0;

  // Seconds-level precision only matters once the deal is nearly gone —
  // showing "2h 15m 43s" ticking every second on an hours-long countdown
  // just reads as jittery, not more informative.
  const expiryMessage = () => {
    if (remainingMs <= 0) return "Deal expired";

    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

    if (hours > 0) return `Deal expires in ${hours}h ${minutes}m`;
    if (minutes > 0) return `Deal expires in ${minutes}m`;
    return `Deal expires in ${seconds}s`;
  };

  // Escalating urgency as the 24h window closes — a real signal read off
  // the actual countdown, not a decorative color choice.
  const urgency: "normal" | "soon" | "critical" =
    percentRemaining <= 10 ? "critical" : percentRemaining <= 25 ? "soon" : "normal";
  const urgencyChipClass = {
    normal: "bg-black/35",
    soon: "bg-amber-500/80",
    critical: "bg-red-500/85",
  }[urgency];
  const urgencyBarClass = {
    normal: "bg-flora-leafBright",
    soon: "bg-amber-300",
    critical: "bg-red-300",
  }[urgency];

  const handleBuyClick = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to buy items",
        variant: "destructive",
      });
      return;
    }

    if (user.id === item.profiles?.user_id) {
      toast({
        title: "Cannot Buy Your Own Post",
        description: "You cannot buy your own item",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get seller's user_id from profiles
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("id", item.seller_id)
        .single();

      if (!sellerProfile) {
        toast({
          title: "Error",
          description: "Seller profile not found",
          variant: "destructive",
        });
        return;
      }

      // Find or create conversation
      const conversationId = await findOrCreateConversation(
        user.id,
        sellerProfile.user_id
      );

      if (!conversationId) {
        toast({
          title: "Error",
          description: "Failed to start conversation",
          variant: "destructive",
        });
        return;
      }

      // Navigate directly to chat page
      navigate(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("live_feed")
        .delete()
        .eq("id", item.id);

      if (error) throw error;

      toast({
        title: "Item Deleted",
        description: "Your live feed item has been deleted",
      });

      onDelete?.();
      onRefresh?.();
    } catch (error) {
      console.error("Error deleting item:", error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to like items",
        variant: "destructive",
      });
      return;
    }

    try {
      if (liked) {
        // Unlike
        await supabase
          .from("live_feed_likes")
          .delete()
          .eq("live_feed_id", item.id)
          .eq("user_id", user.id);
        setLiked(false);
        setLikeCount((prev) => prev - 1);
      } else {
        // Like
        await supabase
          .from("live_feed_likes")
          .insert({ live_feed_id: item.id, user_id: user.id });
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
      onRefresh?.(); // Refresh the feed to update like counts
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  return (
    <div
      id={`live-feed-${item.id}`}
      ref={cardRef}
      className={`group/card relative overflow-hidden rounded-3xl bg-white shadow-card transition-all duration-300 hover:shadow-floating ${
        isOwner ? "ring-2 ring-flora-leaf/30" : ""
      }`}
    >
      <div className="relative aspect-[4/5]">
        <img
          src={item.image_url}
          alt={item.title}
          onClick={() => setIsImageOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsImageOpen(true);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="View full image"
          className="h-full w-full cursor-zoom-in object-cover transition-transform duration-500 group-hover/card:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/50" />

        <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
          <button
            onClick={handleSellerClick}
            className="flex min-w-0 items-center gap-2 rounded-full bg-black/35 py-1 pl-1 pr-3 backdrop-blur-md transition hover:bg-black/45"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 ring-1 ring-white/40">
              {item.profiles?.avatar_url ? (
                <img
                  src={item.profiles.avatar_url}
                  alt={item.profiles.full_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-3.5 w-3.5 text-white" />
              )}
            </span>
            <span className="truncate text-xs font-semibold text-white">
              {item.profiles?.full_name || "Seller"}
            </span>
            {item.profiles?.is_verified && (
              <div
                className="verification-badge-inline flex-shrink-0"
                style={{ width: "12px", height: "12px" }}
              >
                <svg
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  className="text-verified-blue"
                  style={{ width: "12px", height: "12px" }}
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>

          {isOwner && (
            <button
              type="button"
              aria-label="Delete post"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDeleteOpen(true);
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition hover:bg-red-500/80"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="absolute inset-x-3 bottom-3">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md transition-colors duration-500 ${urgencyChipClass}`}
          >
            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
            {expiryMessage()}
          </div>
          <div
            role="progressbar"
            aria-label="Time remaining"
            aria-valuenow={Math.round(percentRemaining)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/25"
          >
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-1000 ease-linear ${urgencyBarClass}`}
              style={{ width: `${percentRemaining}%` }}
            />
          </div>
        </div>
      </div>

      {isOwner && (
        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this post?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove "{item.title}" from the live feed. This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {isImageOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-flora-ink"
          onClick={() => setIsImageOpen(false)}
        >
          <button
            type="button"
            aria-label="Close image"
            onClick={(e) => {
              e.stopPropagation();
              setIsImageOpen(false);
            }}
            className="absolute right-4 top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={item.image_url}
            alt={item.title}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="p-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold text-flora-ink">
            {item.title}
          </h3>
          {item.location && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-flora-muted">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.location}</span>
            </p>
          )}
        </div>

        {item.description && (
          <div className="mt-2 text-sm text-flora-muted">
            <p className="line-clamp-2 break-words">{item.description}</p>
            {item.description.length > 100 && (
              <button
                onClick={() => setShowComments(true)}
                className="mt-0.5 font-medium text-flora-ink hover:text-flora-leaf"
              >
                more
              </button>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLike}
              className={`flex items-center gap-1 rounded-full py-1 pl-1 pr-2 text-xs font-medium transition-all duration-200 ${
                liked
                  ? "text-red-500 bg-red-50 hover:bg-red-100"
                  : "text-flora-muted hover:bg-flora-chip"
              }`}
            >
              <Heart
                className={`h-5 w-5 ${liked ? "fill-red-500 stroke-none" : ""}`}
              />
              {likeCount > 0 && likeCount}
            </button>
            <button
              type="button"
              onClick={() => setShowComments(true)}
              className="flex items-center gap-1 rounded-full py-1 pl-1 pr-2 text-xs font-medium text-flora-muted transition-all duration-200 hover:bg-flora-chip"
            >
              <MessageSquare className="h-5 w-5" />
              {commentCount > 0 && commentCount}
            </button>
            {isOwner && (
              <div
                className="flex items-center gap-1 py-1 pl-1 pr-2 text-xs font-medium text-flora-muted"
                title="Only visible to you"
              >
                <Eye className="h-5 w-5" aria-hidden="true" />
                {viewCount > 0 ? viewCount : 0}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleBuyClick}
            className="flex items-center gap-1.5 rounded-full bg-flora-ink px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            Buy ₦{item.price.toLocaleString()}
          </button>
        </div>
      </div>

      <LiveFeedCommentsSheet
        liveFeedId={item.id}
        description={item.description}
        open={showComments}
        onOpenChange={setShowComments}
        onCommentCountChange={setCommentCount}
        onActivity={onRefresh}
      />
    </div>
  );
};
