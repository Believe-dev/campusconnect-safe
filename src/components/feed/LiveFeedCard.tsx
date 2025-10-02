import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Clock, MessageCircle, Heart, User, Send, MessageSquare, Trash2, MoreVertical } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { findOrCreateConversation } from '@/utils/conversationUtils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

interface LiveFeedCardProps {
  item: LiveFeedItem;
  onDelete?: () => void;
}

export const LiveFeedCard = ({ item, onDelete }: LiveFeedCardProps) => {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Set like status from database data
    const isLiked = item.user_liked && item.user_liked.length > 0;
    console.log(`Card ${item.id}: user_liked=`, item.user_liked, `isLiked=${isLiked}`);
    setLiked(isLiked);
    setLikeCount(item.live_feed_likes?.[0]?.count || 0);
    setCommentCount(item.live_feed_comments?.[0]?.count || 0);
  }, [item.user_liked, item.live_feed_likes, item.live_feed_comments]);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('live_feed_comments')
        .select(`
          id,
          comment,
          created_at,
          user_id
        `)
        .eq('live_feed_id', item.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get profile data for each comment
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('user_id', comment.user_id)
            .single();
          
          return {
            ...comment,
            profiles: profile
          };
        })
      );

      setComments(commentsWithProfiles);
      setCommentCount(commentsWithProfiles.length);
    } catch (error) {
      console.error('Error fetching comments:', error);
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

    const { error } = await supabase
      .from('live_feed_comments')
      .insert({
        live_feed_id: item.id,
        user_id: user.id,
        comment: newComment.trim()
      });

    if (!error) {
      setNewComment('');
      setCommentCount(prev => prev + 1);
      fetchComments();
    }
  };

  const handleSellerClick = async () => {
    const { data: sellerProfile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('id', item.seller_id)
      .single();

    if (sellerProfile) {
      navigate(`/seller/${sellerProfile.user_id}`);
    }
  };

  const timeRemaining = () => {
    const now = new Date();
    const expires = new Date(item.expires_at);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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

    try {
      // Get seller's user_id from profiles
      const { data: sellerProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('id', item.seller_id)
        .single();

      if (!sellerProfile) {
        toast({ title: "Error", description: "Seller profile not found", variant: "destructive" });
        return;
      }

      // Navigate to seller's profile
      navigate(`/seller/${sellerProfile.user_id}`);
    } catch (error) {
      console.error('Error navigating to seller profile:', error);
      toast({ title: "Error", description: "Failed to open seller profile", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('live_feed')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: "Item Deleted",
        description: "Your live feed item has been deleted",
      });

      onDelete?.();
    } catch (error) {
      console.error('Error deleting item:', error);
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
          .from('live_feed_likes')
          .delete()
          .eq('live_feed_id', item.id)
          .eq('user_id', user.id);
        setLiked(false);
        setLikeCount(prev => prev - 1);
      } else {
        // Like
        await supabase
          .from('live_feed_likes')
          .insert({ live_feed_id: item.id, user_id: user.id });
        setLiked(true);
        setLikeCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const progressPercentage = () => {
    const created = new Date(item.created_at);
    const expires = new Date(item.expires_at);
    const now = new Date();
    
    const total = expires.getTime() - created.getTime();
    const elapsed = now.getTime() - created.getTime();
    
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  return (
    <div className={`relative rounded-2xl shadow-lg overflow-hidden border ${isOwner ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'}`}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200">
        <div 
          className="h-full bg-gradient-to-r from-green-500 to-yellow-500 transition-all duration-1000"
          style={{ width: `${progressPercentage()}%` }}
        />
      </div>

      <div className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {item.profiles?.avatar_url ? (
                <img 
                  src={item.profiles.avatar_url} 
                  alt={item.profiles.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-gray-500" />
              )}
            </div>
            <div>
              <button 
                onClick={handleSellerClick}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                {item.profiles?.full_name || 'Seller'}
              </button>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">{timeRemaining()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isOwner ? "default" : "secondary"} className="text-xs">
              {isOwner ? "My Post" : "Live"}
            </Badge>
            {isOwner && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDelete}
                className="h-6 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                <span className="text-xs">Delete</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="relative aspect-square">
        <img 
          src={item.image_url} 
          alt={item.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-2 right-2">
          <Badge className="bg-black/70 text-white text-sm font-bold">
            ₦{item.price.toLocaleString()}
          </Badge>
        </div>
      </div>

      <div className="p-4 pt-3">
        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
          {item.title}
        </h3>
        {item.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              className={`p-2 flex items-center gap-1 ${liked ? 'text-red-500' : 'text-gray-500'}`}
            >
              <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMessage}
              className="p-2 text-gray-500"
            >
              <MessageCircle className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowComments}
              className="p-2 text-gray-500 flex items-center gap-1"
            >
              <MessageSquare className="w-5 h-5" />
              {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
            </Button>
          </div>
          
          {item.location && (
            <Badge variant="outline" className="text-xs">
              {item.location}
            </Badge>
          )}
        </div>

        {showComments && (
          <div className="border-t border-gray-100 p-4 space-y-3">
            {loadingComments ? (
              <div className="text-center text-gray-500 text-sm">Loading comments...</div>
            ) : (
              <>
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {comment.profiles?.avatar_url ? (
                        <img 
                          src={comment.profiles.avatar_url} 
                          alt={comment.profiles.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{comment.profiles?.full_name}</span>
                      <span className="text-gray-600 ml-2">{comment.comment}</span>
                    </div>
                  </div>
                ))}
                
                {user && (
                  <div className="flex gap-2 pt-2">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
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