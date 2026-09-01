import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ProfileReviewModalProps {
  open: boolean;
  onClose: () => void;
  sellerId: string;
  sellerName: string;
  orderId: string;
}

export const ProfileReviewModal = ({ open, onClose, sellerId, sellerName, orderId }: ProfileReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Rating Required",
        description: "Please select a rating",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Insert review
      const { error } = await supabase.from('reviews').insert({
        reviewer_id: user.id,
        reviewed_id: sellerId,
        order_id: orderId,
        rating,
        comment: comment.trim(),
      });

      if (error) throw error;

      toast({
        title: "Review Submitted",
        description: "Thank you for your feedback!",
      });

      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md border-flora-ink/10 bg-flora-card text-flora-ink">
        <DialogHeader>
          <DialogTitle className="text-flora-ink">Rate Your Experience</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-flora-muted">
            How was your experience with {sellerName}?
          </p>

          <div>
            <Label className="text-flora-ink">Rating</Label>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1"
                >
                  <Star
                    className={cn(
                      "h-6 w-6",
                      star <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-flora-chip"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="comment" className="text-flora-ink">Comment (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1 border-flora-ink/15 bg-white text-flora-ink"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full border border-flora-ink/15 bg-white px-4 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 rounded-full bg-flora-ink px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};