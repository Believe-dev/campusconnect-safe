import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Star } from 'lucide-react';
import { Tag } from '@/components/ui/tag';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

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
  sellerId?: string;
  // Lets a page style the outer surface itself (e.g. a card only from a
  // given breakpoint up) without this component needing to know about it.
  className?: string;
}

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

export const ProductReviews = ({ productId, sellerId, className }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchReviews();
    checkCanReview();
    // isAdmin starts false and flips true once useAuth's own role lookup
    // resolves — re-run so an admin viewing this component doesn't stay
    // stuck on the buyer-only result from before that lookup finished.
  }, [productId, isAdmin]);

  const checkCanReview = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanReview(false);
        return;
      }

      // Admins can review any product — skips the seller-exclusion and
      // purchase-history checks below entirely.
      if (isAdmin) {
        setCanReview(true);
        return;
      }

      // Don't allow sellers to review their own products
      if (sellerId && user.id === sellerId) {
        setCanReview(false);
        return;
      }

      // Check if user has a confirmed order with this product. 'confirmed'
      // (not 'completed' — that was never a real value here) is the actual
      // terminal status in the orders table's own CHECK constraint: pending
      // -> paid -> shipped -> delivered -> confirmed.
      const { data, error } = await supabase
        .from('orders')
        .select('id, status')
        .eq('product_id', productId)
        .eq('buyer_id', user.id)
        .eq('status', 'confirmed')
        .limit(1);

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

  const handleReviewToggle = () => {
    if (!canReview) {
      toast({
        title: "Cannot Review",
        description: "You must have purchased this product before leaving a review.",
        variant: "destructive",
      });
      return;
    }
    setShowReviewForm((v) => !v);
  };

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-3 p-6">
          <div className="h-4 w-1/3 rounded bg-flora-chip" />
          <div className="h-16 rounded bg-flora-chip" />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-flora-ink">
            Reviews
            {reviews.length > 0 && ` (${reviews.length})`}
            {averageRating > 0 && (
              <span className="flex items-center gap-1 text-sm font-medium text-flora-ink">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                {averageRating.toFixed(1)}
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={handleReviewToggle}
            className="flex-shrink-0 rounded-full border border-flora-ink/10 px-4 py-2 text-xs font-semibold text-flora-ink transition hover:bg-flora-chip"
          >
            {showReviewForm ? 'Cancel' : 'Review'}
          </button>
        </div>

        {showReviewForm && (
          <div className="mt-4 rounded-2xl border border-flora-ink/10 bg-flora-chip p-4">
            <h4 className="mb-3 text-sm font-semibold text-flora-ink">Write a Review</h4>
            <div className="mb-3">
              <p className="mb-2 text-xs font-medium text-flora-muted">Rating</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    aria-pressed={star <= rating}
                    className="p-0.5 transition hover:scale-110"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-flora-ink/20'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor="review-comment" className="mb-2 block text-xs font-medium text-flora-muted">
                Comment (optional)
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={3}
                className="w-full rounded-xl border border-flora-ink/10 bg-white px-3 py-2 text-sm text-flora-ink placeholder:text-flora-muted focus:border-flora-leaf focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitReview}
                disabled={submitting || rating === 0}
                className="rounded-full bg-flora-leaf px-4 py-2 text-xs font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReviewForm(false);
                  setRating(0);
                  setComment('');
                }}
                className="rounded-full border border-flora-ink/10 bg-white px-4 py-2 text-xs font-semibold text-flora-ink transition hover:bg-flora-chip"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {reviews.length === 0 ? (
          <p className="mt-4 text-sm text-flora-muted">
            No reviews yet. Be the first to review this product!
          </p>
        ) : (
          <div className="mt-4 space-y-5">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border-t border-flora-ink/10 pt-5 first:border-t-0 first:pt-0"
              >
                <div className="flex items-start gap-3">
                  {review.reviewer.avatar_url ? (
                    <img
                      src={review.reviewer.avatar_url}
                      alt=""
                      className="h-10 w-10 flex-shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-flora-leaf text-sm font-medium text-white">
                      {getInitials(review.reviewer.full_name)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium text-flora-ink">
                        {review.reviewer.full_name}
                      </span>
                      {review.reviewer.is_verified && (
                        <Tag variant="outline" className="px-2 py-0.5 text-[10px]">
                          Verified
                        </Tag>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${
                            star <= review.rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-flora-ink/15'
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                      <span className="ml-1.5 text-xs text-flora-muted">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {review.comment && (
                      <p className="mt-2 text-sm leading-relaxed text-flora-muted">
                        {review.comment}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
