import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url?: string;
    is_verified: boolean;
  };
}

interface ProductReviewsProps {
  productId: string;
}

export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
    checkCanReview();
  }, [productId]);

  const checkCanReview = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanReview(false);
        return;
      }

      // Check if user has ordered this product (any status)
      const { data, error } = await supabase
        .from('orders')
        .select('id, status')
        .eq('product_id', productId)
        .eq('buyer_id', user.id)
        .limit(1);
      
      console.log('Order check for product', productId, ':', data);

      if (error) throw error;
      setCanReview(data && data.length > 0);
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      setCanReview(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer_id,
          profiles!product_reviews_reviewer_id_fkey (
            full_name,
            avatar_url,
            is_verified
          )
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
        // Try alternative query if the foreign key relationship fails
        const { data: altData, error: altError } = await supabase
          .from('product_reviews')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });
        
        if (altError) {
          console.error('Alternative query also failed:', altError);
          setReviews([]);
          setLoading(false);
          return;
        }
        
        // Manually fetch profile data for each review
        const reviewsWithProfiles = await Promise.all(
          (altData || []).map(async (review) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, avatar_url, is_verified')
              .eq('user_id', review.reviewer_id)
              .single();
            
            return {
              id: review.id,
              rating: review.rating,
              comment: review.comment,
              created_at: review.created_at,
              reviewer: {
                full_name: profileData?.full_name || 'Anonymous',
                avatar_url: profileData?.avatar_url,
                is_verified: profileData?.is_verified || false
              }
            };
          })
        );
        
        setReviews(reviewsWithProfiles);
        
        // Calculate average rating
        if (reviewsWithProfiles.length > 0) {
          const avg = reviewsWithProfiles.reduce((sum, review) => sum + review.rating, 0) / reviewsWithProfiles.length;
          setAverageRating(avg);
        }
        setLoading(false);
        return;
      }

      // Transform the data to match expected structure
      const transformedReviews = (data || []).map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        reviewer: {
          full_name: review.profiles?.full_name || 'Anonymous',
          avatar_url: review.profiles?.avatar_url,
          is_verified: review.profiles?.is_verified || false
        }
      }));

      setReviews(transformedReviews);
      
      // Calculate average rating
      if (transformedReviews.length > 0) {
        const avg = transformedReviews.reduce((sum, review) => sum + review.rating, 0) / transformedReviews.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async () => {
    if (rating === 0) {
      toast({
        title: "Error",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('product_reviews')
        .insert({
          product_id: productId,
          reviewer_id: user.id,
          rating,
          comment: comment.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Review Submitted",
        description: "Thank you for your review!",
      });

      // Reset form
      setRating(0);
      setComment('');
      setShowReviewForm(false);
      
      // Refresh reviews
      fetchReviews();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. You may have already reviewed this product.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reviews.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Reviews</CardTitle>
            {canReview && (
              <Button 
                onClick={() => setShowReviewForm(!showReviewForm)}
                variant="outline"
                size="sm"
              >
                {showReviewForm ? 'Cancel' : 'Write Review'}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showReviewForm && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-3">Write a Review</h4>
              <div className="mb-3">
                <label className="text-sm font-medium mb-2 block">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 hover:text-yellow-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="text-sm font-medium mb-2 block">Comment (optional)</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this product..."
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={submitReview}
                  disabled={submitting || rating === 0}
                  size="sm"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
                <Button 
                  onClick={() => {
                    setShowReviewForm(false);
                    setRating(0);
                    setComment('');
                  }}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            Reviews ({reviews.length})
            {averageRating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{averageRating.toFixed(1)}</span>
              </div>
            )}
          </CardTitle>
          {canReview && (
            <Button 
              onClick={() => setShowReviewForm(!showReviewForm)}
              variant="outline"
              size="sm"
            >
              {showReviewForm ? 'Cancel' : 'Write Review'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showReviewForm && (
          <div className="border rounded-lg p-4 bg-muted/50">
            <h4 className="font-medium mb-3">Write a Review</h4>
            <div className="mb-3">
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium mb-2 block">Comment (optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={submitReview}
                disabled={submitting || rating === 0}
                size="sm"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </Button>
              <Button 
                onClick={() => {
                  setShowReviewForm(false);
                  setRating(0);
                  setComment('');
                }}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        {reviews.map((review) => (
          <div key={review.id} className="border-b pb-4 last:border-b-0">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={review.reviewer.avatar_url} />
                <AvatarFallback className="bg-university-green text-white">
                  {getInitials(review.reviewer.full_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{review.reviewer.full_name}</span>
                  {review.reviewer.is_verified && (
                    <Badge variant="outline" className="text-xs">
                      Verified
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {review.comment && (
                  <p className="text-sm text-muted-foreground">{review.comment}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};