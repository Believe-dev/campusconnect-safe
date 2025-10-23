import { useState, useEffect } from "react";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Clock,
  MessageCircle,
  Heart,
  User,
  Send,
  MessageSquare,
  Trash2,
  MoreVertical,
  ChevronDown,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { findOrCreateConversation } from "@/utils/conversationUtils";

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
  user_liked?: { user_id: string }[];
}

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
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [showReplies, setShowReplies] = useState<Record<string, boolean>>({});
  const [expandedDescription, setExpandedDescription] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Set like status from database data
    const isLiked = item.user_liked && item.user_liked.length > 0;
    console.log(
      `Card ${item.id}: user_liked=`,
      item.user_liked,
      `isLiked=${isLiked}`
    );
    setLiked(isLiked);
    setLikeCount(item.live_feed_likes?.[0]?.count || 0);
    setCommentCount(item.live_feed_comments?.[0]?.count || 0);
  }, [item.user_liked, item.live_feed_likes, item.live_feed_comments]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDeleteMenu && !target.closest(".dropdown-container")) {
        setShowDeleteMenu(false);
      }
    };
    if (showDeleteMenu) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showDeleteMenu]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("live_feed_comments")
        .select(
          `
          id,
          comment,
          created_at,
          user_id,
          parent_comment_id
        `
        )
        .eq("live_feed_id", item.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Get profile data and like counts for each comment
      const commentsWithData = await Promise.all(
        (data || []).map(async (comment) => {
          const [profileResult, likeCountResult, userLikedResult] =
            await Promise.all([
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

      // Organize comments into parent-child structure
      const parentComments = commentsWithData.filter(
        (c) => !c.parent_comment_id
      );
      const childComments = commentsWithData.filter((c) => c.parent_comment_id);

      const organizedComments = parentComments.map((parent) => ({
        ...parent,
        replies: childComments.filter(
          (child) => child.parent_comment_id === parent.id
        ),
      }));

      setComments(organizedComments);
      setCommentCount(commentsWithData.length);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleShowComments = () => {
    setShowComments(!showComments);
    if (!showComments) {
      fetchComments();
    }
  };

  const handleAddComment = async () => {
    if (!user || !newComment.trim()) return;

    const { error } = await supabase.from("live_feed_comments").insert({
      live_feed_id: item.id,
      user_id: user.id,
      comment: newComment.trim(),
    });

    if (!error) {
      setNewComment("");
      setCommentCount((prev) => prev + 1);
      fetchComments();
      onRefresh?.(); // Refresh the feed to update comment counts
    }
  };

  const handleAddReply = async (
    parentCommentId: string,
    parentUserName: string
  ) => {
    if (!user || !replyText.trim()) return;

    const replyWithMention = `@${parentUserName} ${replyText.trim()}`;

    const { error } = await supabase.from("live_feed_comments").insert({
      live_feed_id: item.id,
      user_id: user.id,
      comment: replyWithMention,
      parent_comment_id: parentCommentId,
    });

    if (!error) {
      setReplyText("");
      setReplyingTo(null);
      setCommentCount((prev) => prev + 1);
      fetchComments();
      onRefresh?.();
    }
  };

  const handleCommentLike = async (commentId: string, isLiked: boolean) => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to like comments",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("live_feed_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
      } else {
        // Like
        await supabase
          .from("live_feed_comment_likes")
          .insert({ comment_id: commentId, user_id: user.id });
      }

      // Refresh comments to update like counts
      fetchComments();
    } catch (error) {
      console.error("Error toggling comment like:", error);
    }
  };

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

  const timeRemaining = () => {
    const expires = new Date(item.expires_at);
    const diff = expires.getTime() - currentTime.getTime();

    if (diff <= 0) return "Expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const handleMessage = async () => {
    if (!user) {
      toast({
        title: "Sign In Required",
        description: "Please sign in to message sellers",
        variant: "destructive",
      });
      return;
    }

    if (user.id === item.profiles?.user_id) {
      toast({
        title: "Cannot Message Yourself",
        description: "You cannot message yourself about your own post",
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

  // Use the is_owner flag from the item
  const isOwner = item.is_owner || false;

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
      className={`relative rounded-3xl shadow-sm border overflow-hidden transition-all duration-300 hover:shadow-lg ${
        isOwner
          ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
          : "bg-white border-gray-100"
      }`}
    >
      <div className="p-3 sm:p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-start flex-col gap-3">
            <div className="flex items-center gap-1">
              <button onClick={handleSellerClick}>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
                    {item.profiles?.avatar_url ? (
                      <img
                        src={item.profiles.avatar_url}
                        alt={item.profiles.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 text-purple-500" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  </div>
                </div>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSellerClick}
                  className="text-sm font-semibold text-gray-900 hover:text-purple-600 transition-colors"
                >
                  {item.profiles?.full_name || "Seller"}
                </button>
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
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">
                  {timeRemaining()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Badge
              variant={isOwner ? "default" : "secondary"}
              className={`text-xs px-2 py-1 rounded-full ${
                isOwner
                  ? "bg-purple-100 text-purple-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isOwner ? "Me" : "Live"}
            </Badge>
            {isOwner && (
              <div className="relative dropdown-container">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteMenu(!showDeleteMenu);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {showDeleteMenu && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[140px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete();
                        setShowDeleteMenu(false);
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 w-fit text-left"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative aspect-square group">
        <img
          src={item.image_url}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute bottom-3 right-3">
          <Badge className="bg-black/80 backdrop-blur-sm text-white text-sm font-bold px-3 py-1.5 rounded-full shadow-lg">
            ₦{item.price.toLocaleString()}
          </Badge>
        </div>
      </div>

      <div className="p-3 sm:p-4 pt-3">
        <div className="flex flex-col justify-between mb-1">
          {item.location && (
            <Badge
              variant="outline"
              className="flex gap-1 items-center text-xs px-2 py-1 rounded-full w-fit bg-gray-50"
            >
              <MapPin className="h-3 w-3" /> {item.location}
            </Badge>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`p-0 rounded-full transition-all duration-200 hover:scale-110 ${
                liked
                  ? "text-university-red bg-university-red/10 hover:bg-university-red/20"
                  : "text-gray-600 hover:bg-university-green/10"
              }`}
            >
              <Heart
                className={`w-7 h-7 ${
                  liked ? "fill-red-500  stroke-none" : "hover:stroke-black"
                }`}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowComments}
              className="p-1 rounded-full text-gray-600 hover:bg-university-green/10 transition-all duration-200 hover:scale-110"
            >
              <MessageSquare className="w-6 h-6" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMessage}
              className="p-1 rounded-full text-gray-600 hover:bg-university-green/10 transition-all duration-200 hover:scale-110"
            >
              <MessageCircle className="w-6 h-6" />
            </Button>
          </div>
        </div>

        {likeCount > 0 && (
          <p className="text-sm font-semibold text-university-green mb-2">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </p>
        )}

        <div className="space-y-1">
          <div className="text-sm text-gray-900">
            <span className="font-semibold">{item.title}</span>
          </div>
          {item.description && (
            <div className="text-sm text-gray-600">
              {expandedDescription ? (
                <div>
                  <p className="break-words">{item.description}</p>
                  <button
                    onClick={() => setExpandedDescription(false)}
                    className="text-gray-500 hover:text-university-green ml-1 font-medium"
                  >
                    ...less
                  </button>
                </div>
              ) : (
                <div>
                  {item.description.length > 100 ? (
                    <>
                      <span>{item.description.slice(0, 70)}</span>
                      <button
                        onClick={() => setExpandedDescription(true)}
                        className="text-gray-500 hover:text-university-green ml-1 font-medium"
                      >
                        ...more
                      </button>
                    </>
                  ) : (
                    <span>{item.description}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {commentCount > 0 && (
          <button
            onClick={handleShowComments}
            className="text-sm text-gray-500 mt-2 hover:text-gray-700 transition-colors"
          >
            View all {commentCount} comments
          </button>
        )}

        {showComments && (
          <div className="border-t border-gray-100 mt-3 pt-3 space-y-3">
            {loadingComments ? (
              <div className="text-center text-gray-500 text-sm py-4">
                Loading comments...
              </div>
            ) : (
              <>
                <div className="max-h-60 overflow-y-auto space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="group">
                      <div className="flex gap-3 text-sm">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {comment.profiles?.avatar_url ? (
                            <img
                              src={comment.profiles.avatar_url}
                              alt={comment.profiles.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-purple-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="bg-gray-50 rounded-2xl px-3 py-2">
                            <span className="font-semibold text-gray-900 text-sm">
                              {comment.profiles?.full_name}
                            </span>
                            <p className="text-gray-700 text-sm mt-0.5 break-words">
                              {comment.comment}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 mt-1 ml-3">
                            <button
                              onClick={() =>
                                handleCommentLike(
                                  comment.id,
                                  comment.user_liked || false
                                )
                              }
                              className={`text-xs font-medium transition-colors ${
                                comment.user_liked
                                  ? "text-university-red hover:text-university-red/80"
                                  : "text-gray-500 hover:text-university-green"
                              }`}
                            >
                              {comment.like_count || 0}{" "}
                              {comment.user_liked ? "Unlike" : "Like"}
                            </button>
                            <button
                              onClick={() =>
                                setReplyingTo(
                                  replyingTo === comment.id ? null : comment.id
                                )
                              }
                              className="text-xs text-gray-500 hover:text-university-green font-medium"
                            >
                              Reply
                            </button>
                            <span className="text-xs text-gray-400">
                              {new Date(
                                comment.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Show Replies Button */}
                          {comment.replies && comment.replies.length > 0 && (
                            <button
                              onClick={() =>
                                setShowReplies((prev) => ({
                                  ...prev,
                                  [comment.id]: !prev[comment.id],
                                }))
                              }
                              className="flex items-center gap-1 ml-3 text-xs -m-2 text-gray-500 hover:text-university-green font-medium"
                            >
                              <ChevronDown
                                className={`w-3 h-3 transition-transform ${
                                  showReplies[comment.id] ? "rotate-180" : ""
                                }`}
                              />
                              {comment.replies.length}{" "}
                              {comment.replies.length === 1
                                ? "reply"
                                : "replies"}
                            </button>
                          )}

                          {/* Replies */}
                          {comment.replies &&
                            comment.replies.length > 0 &&
                            showReplies[comment.id] && (
                              <div className="ml-6 mt-3 space-y-2">
                                {comment.replies.map((reply) => (
                                  <div
                                    key={reply.id}
                                    className="flex gap-2 text-sm"
                                  >
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                      {reply.profiles?.avatar_url ? (
                                        <img
                                          src={reply.profiles.avatar_url}
                                          alt={reply.profiles.full_name}
                                          className="w-full h-full object-cover"
                                        />
                                      ) : (
                                        <User className="w-3 h-3 text-purple-500" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="bg-gray-50 rounded-xl px-2 py-1.5">
                                        <span className="font-semibold text-gray-900 text-xs">
                                          {reply.profiles?.full_name}
                                        </span>
                                        <p className="text-gray-700 text-xs mt-0.5 break-words">
                                          {reply.comment}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-3 mt-1 ml-2">
                                        <button
                                          onClick={() =>
                                            handleCommentLike(
                                              reply.id,
                                              reply.user_liked || false
                                            )
                                          }
                                          className={`text-xs font-medium transition-colors ${
                                            reply.user_liked
                                              ? "text-university-red hover:text-university-red/80"
                                              : "text-gray-500 hover:text-university-green"
                                          }`}
                                        >
                                          {reply.like_count || 0}{" "}
                                          {reply.user_liked ? "Unlike" : "Like"}
                                        </button>
                                        <span className="text-xs text-gray-400">
                                          {new Date(
                                            reply.created_at
                                          ).toLocaleDateString()}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                          {replyingTo === comment.id && (
                            <div className="flex gap-2 mt-2 ml-3">
                              <Input
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder={`Reply to ${comment.profiles?.full_name}...`}
                                className="flex-1 text-sm rounded-full"
                                onKeyPress={(e) => {
                                  if (e.key === "Enter") {
                                    handleAddReply(comment.id);
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() =>
                                  handleAddReply(
                                    comment.id,
                                    comment.profiles?.full_name || "User"
                                  )
                                }
                                disabled={!replyText.trim()}
                                className="rounded-full px-4 bg-university-green hover:bg-university-green/90"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {user && (
                  <div className="flex gap-3 pt-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <User className="w-4 h-4 text-purple-500" />
                    </div>
                    <div className="flex-1 flex gap-2">
                      <Input
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 text-sm rounded-full border-gray-200 focus:border-university-green"
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleAddComment()
                        }
                      />
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="rounded-full px-4 bg-university-green hover:bg-university-green/90"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
