import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { ChevronDown, Heart, Send, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user_id: string;
  parent_comment_id?: string;
  profiles?: {
    full_name: string;
    avatar_url: string;
  };
  like_count?: number;
  user_liked?: boolean;
  replies?: Comment[];
}

interface LiveFeedCommentsSheetProps {
  liveFeedId: string;
  // Shown as the first item in the thread, above the actual comments —
  // lets someone who tapped "more" on a truncated caption read the rest
  // without a separate inline-expand affordance on the card itself.
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Reports the true server-side comment count back to the card once a
  // fetch resolves, since replies count toward the total shown there too.
  onCommentCountChange?: (count: number) => void;
  // Lets the parent card/feed re-sync (e.g. sort order) after new activity.
  onActivity?: () => void;
}

// Tracks how much the on-screen keyboard currently covers of the layout
// viewport. iOS/Android keep `position: fixed` elements pinned to the
// layout viewport, not the visual one, so a fixed comment bar silently
// ends up hidden behind the keyboard unless it's nudged up by this exact
// amount. Only listens while the sheet is actually open.
const useKeyboardInset = (enabled: boolean) => {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) {
      setInset(0);
      return;
    }

    const updateInset = () => {
      const covered = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(Math.max(0, Math.round(covered)));
    };

    updateInset();
    viewport.addEventListener("resize", updateInset);
    viewport.addEventListener("scroll", updateInset);
    return () => {
      viewport.removeEventListener("resize", updateInset);
      viewport.removeEventListener("scroll", updateInset);
    };
  }, [enabled]);

  return inset;
};

export const LiveFeedCommentsSheet = ({
  liveFeedId,
  description,
  open,
  onOpenChange,
  onCommentCountChange,
  onActivity,
}: LiveFeedCommentsSheetProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const keyboardInset = useKeyboardInset(open);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("live_feed_comments")
        .select("id, comment, created_at, user_id, parent_comment_id")
        .eq("live_feed_id", liveFeedId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const withData = await Promise.all(
        (data || []).map(async (comment) => {
          const [profileResult, likeCountResult, userLikedResult] = await Promise.all([
            supabase
              .from("profiles")
              .select("full_name, avatar_url")
              .eq("user_id", comment.user_id)
              .single(),
            supabase
              .from("live_feed_comment_likes")
              .select("id", { count: "exact" })
              .eq("comment_id", comment.id),
            user
              ? supabase
                  .from("live_feed_comment_likes")
                  .select("id")
                  .eq("comment_id", comment.id)
                  .eq("user_id", user.id)
                  .single()
              : Promise.resolve({ data: null }),
          ]);

          return {
            ...comment,
            profiles: profileResult.data,
            like_count: likeCountResult.count || 0,
            user_liked: !!userLikedResult.data,
          };
        })
      );

      const parents = withData.filter((c) => !c.parent_comment_id);
      const children = withData.filter((c) => c.parent_comment_id);

      setComments(
        parents.map((parent) => ({
          ...parent,
          replies: children.filter((child) => child.parent_comment_id === parent.id),
        }))
      );
      onCommentCountChange?.(withData.length);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, liveFeedId]);

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    const { error } = await supabase.from("live_feed_comments").insert({
      live_feed_id: liveFeedId,
      user_id: user.id,
      comment: newComment.trim(),
    });

    if (!error) {
      setNewComment("");
      fetchComments();
      onActivity?.();
    }
  };

  const handleAddReply = async (parentCommentId: string, parentUserName: string) => {
    if (!user || !replyText.trim()) return;

    const { error } = await supabase.from("live_feed_comments").insert({
      live_feed_id: liveFeedId,
      user_id: user.id,
      comment: `@${parentUserName} ${replyText.trim()}`,
      parent_comment_id: parentCommentId,
    });

    if (!error) {
      setReplyText("");
      setReplyingTo(null);
      fetchComments();
      onActivity?.();
    }
  };

  const handleToggleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      if (isLiked) {
        await supabase
          .from("live_feed_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("live_feed_comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
      }
      fetchComments();
    } catch (error) {
      console.error("Error toggling comment like:", error);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        style={{ bottom: keyboardInset }}
        className="flex h-[85vh] flex-col p-0 sm:mx-auto sm:max-w-lg"
        // Radix focuses the first focusable descendant on open by default —
        // on a post with no comments yet, that's the comment input itself,
        // which silently summons the keyboard just from opening the sheet
        // to read. Keep focus off everything until the user actually taps
        // the input.
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="shrink-0 border-b border-flora-ink/10 px-4 py-3 text-left">
          <SheetTitle>Comments{comments.length > 0 ? ` · ${comments.length}` : ""}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {description && (
            <div className="mb-4 rounded-2xl bg-flora-chip p-3 text-sm text-flora-ink">
              <p className="whitespace-pre-wrap break-words">{description}</p>
            </div>
          )}

          {loading ? (
            <CommentsLoadingSkeleton />
          ) : comments.length === 0 ? (
            <EmptyCommentsState />
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  replyingTo={replyingTo}
                  replyText={replyText}
                  onReplyTextChange={setReplyText}
                  onToggleReplyTo={(id) => setReplyingTo((prev) => (prev === id ? null : id))}
                  onSubmitReply={handleAddReply}
                  onToggleLike={handleToggleCommentLike}
                  repliesExpanded={!!expandedReplies[comment.id]}
                  onToggleReplies={() =>
                    setExpandedReplies((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }))
                  }
                />
              ))}
            </div>
          )}
        </div>

        {user && (
          <div className="shrink-0 border-t border-flora-ink/10 p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-flora-chip">
                <User className="h-4 w-4 text-flora-muted" />
              </div>
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 rounded-full border-0 bg-flora-chip text-sm focus-visible:ring-flora-leaf/40"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddComment();
                }}
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                aria-label="Post comment"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flora-ink text-white transition hover:brightness-110 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const CommentsLoadingSkeleton = () => (
  <div className="space-y-4 py-1">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex animate-pulse gap-3">
        <div className="h-8 w-8 shrink-0 rounded-full bg-flora-chip" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-24 rounded-full bg-flora-chip" />
          <div className="h-3 w-full rounded-full bg-flora-chip" />
        </div>
      </div>
    ))}
  </div>
);

const EmptyCommentsState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-flora-chip">
      <Send className="h-5 w-5 text-flora-muted" />
    </div>
    <p className="text-sm font-medium text-flora-ink">No comments yet</p>
    <p className="text-xs text-flora-muted">Be the first to say something</p>
  </div>
);

interface CommentThreadProps {
  comment: Comment;
  replyingTo: string | null;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onToggleReplyTo: (commentId: string) => void;
  onSubmitReply: (parentId: string, parentUserName: string) => void;
  onToggleLike: (commentId: string, isLiked: boolean) => void;
  repliesExpanded: boolean;
  onToggleReplies: () => void;
}

const CommentThread = ({
  comment,
  replyingTo,
  replyText,
  onReplyTextChange,
  onToggleReplyTo,
  onSubmitReply,
  onToggleLike,
  repliesExpanded,
  onToggleReplies,
}: CommentThreadProps) => {
  const hasReplies = !!comment.replies?.length;
  const authorName = comment.profiles?.full_name || "User";

  return (
    <div>
      <CommentBubble comment={comment} onToggleLike={onToggleLike} onReply={() => onToggleReplyTo(comment.id)} />

      {hasReplies && (
        <button
          type="button"
          onClick={onToggleReplies}
          className="ml-11 mt-1 flex items-center gap-1 text-xs font-medium text-flora-muted hover:text-flora-ink"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${repliesExpanded ? "rotate-180" : ""}`} />
          {comment.replies!.length} {comment.replies!.length === 1 ? "reply" : "replies"}
        </button>
      )}

      {hasReplies && repliesExpanded && (
        <div className="ml-11 mt-2 space-y-3">
          {comment.replies!.map((reply) => (
            <CommentBubble key={reply.id} comment={reply} compact onToggleLike={onToggleLike} />
          ))}
        </div>
      )}

      {replyingTo === comment.id && (
        <div className="ml-11 mt-2 flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder={`Reply to ${authorName}...`}
            className="flex-1 rounded-full border-0 bg-flora-chip text-sm focus-visible:ring-flora-leaf/40"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmitReply(comment.id, authorName);
            }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => onSubmitReply(comment.id, authorName)}
            disabled={!replyText.trim()}
            aria-label="Post reply"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-flora-ink text-white transition hover:brightness-110 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

interface CommentBubbleProps {
  comment: Comment;
  compact?: boolean;
  onToggleLike: (commentId: string, isLiked: boolean) => void;
  onReply?: () => void;
}

const CommentBubble = ({ comment, compact, onToggleLike, onReply }: CommentBubbleProps) => (
  <div className="flex gap-3">
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-flora-chip ${
        compact ? "h-6 w-6" : "h-8 w-8"
      }`}
    >
      {comment.profiles?.avatar_url ? (
        <img
          src={comment.profiles.avatar_url}
          alt={comment.profiles.full_name}
          className="h-full w-full object-cover"
        />
      ) : (
        <User className={compact ? "h-3 w-3 text-flora-muted" : "h-4 w-4 text-flora-muted"} />
      )}
    </div>
    <div className="min-w-0 flex-1">
      <div className={`rounded-2xl bg-flora-chip px-3 py-2 ${compact ? "text-xs" : "text-sm"}`}>
        <span className="font-semibold text-flora-ink">{comment.profiles?.full_name || "User"}</span>
        <p className="mt-0.5 break-words text-flora-ink/80">{comment.comment}</p>
      </div>
      <div className="mt-1 flex items-center gap-3 pl-3 text-xs text-flora-muted">
        <button
          type="button"
          onClick={() => onToggleLike(comment.id, !!comment.user_liked)}
          className={`flex items-center gap-1 font-medium transition-colors ${
            comment.user_liked ? "text-red-500" : "hover:text-flora-ink"
          }`}
        >
          <Heart className={`h-3 w-3 ${comment.user_liked ? "fill-red-500 stroke-none" : ""}`} />
          {comment.like_count ? comment.like_count : ""}
        </button>
        {onReply && (
          <button type="button" onClick={onReply} className="font-medium hover:text-flora-ink">
            Reply
          </button>
        )}
        <span>{new Date(comment.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  </div>
);
