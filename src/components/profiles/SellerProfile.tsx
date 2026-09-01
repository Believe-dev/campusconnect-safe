import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Star,
  MessageCircle,
  MapPin,
  GraduationCap,
  User,
  Package,
  Phone,
  Headphones,
  Share2,
  Check,
  ShieldCheck,
} from "lucide-react";
import { PremiumGameBadge } from "@/components/games/PremiumGameBadge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { shareSellerProfile, generateSellerProfileUrl } from "@/utils/shareUtils";

interface SellerProfile {
  id: string;
  user_id: string;
  full_name: string;
  university_name?: string;
  campus: string;
  bio: string;
  avatar_url: string;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  seller_status: string;
  phone_number?: string;
  business_name?: string;
  created_at: string;
}

interface GameBadgeData {
  overall_level: number;
  badge_type: "bronze" | "silver" | "gold" | "none";
  is_premium: boolean;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url: string;
  };
}

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  condition: string;
  images: string[];
  stock_quantity: number;
  created_at: string;
}

const SellerProfile = () => {
  const { sellerId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [ratingInput, setRatingInput] = useState<number>(0);
  const [commentInput, setCommentInput] = useState<string>("");
  const [visibleProducts, setVisibleProducts] = useState(6);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [gameBadge, setGameBadge] = useState<GameBadgeData | null>(null);
  const [isSellerAdmin, setIsSellerAdmin] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!seller) return;
    const shared = await shareSellerProfile(seller);
    if (shared) {
      setCopied(true);
      toast({ title: navigator.share ? 'Shared!' : 'Link copied!', description: generateSellerProfileUrl(seller.user_id) });
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({ title: 'Could not share', variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (sellerId) {
      fetchSellerProfile();
      fetchSellerReviews();
      fetchSellerProducts();
      fetchGameBadge();
    }
  }, [sellerId]);

  // Check admin status after seller profile is loaded
  useEffect(() => {
    if (seller) {
      checkAdminStatus();
    }
  }, [seller]);

  const fetchGameBadge = async () => {
    try {
      const { data, error } = await supabase.rpc("get_user_game_badge", {
        p_user_id: sellerId,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setGameBadge(data[0]);
      }
    } catch (error) {
      console.error("Error fetching game badge:", error);
    }
  };

  const checkAdminStatus = async () => {
    if (!seller?.user_id) return;

    try {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", seller.user_id)
        .eq("role", "admin")
        .maybeSingle();

      setIsSellerAdmin(!!roles);
    } catch (error) {
      setIsSellerAdmin(false);
    }
  };

  const fetchSellerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          user_id,
          full_name,
          campus,
          university_name,
          bio,
          avatar_url,
          rating,
          total_reviews,
          is_verified,
          seller_status,
          account_type,
          phone_number,
          department,
          business_name,
          created_at
        `
        )
        .eq("user_id", sellerId)
        .single();

      if (error) throw error;
      setSeller(data);
    } catch (error) {
      console.error("Error fetching seller profile:", error);
      toast({
        title: "Error",
        description: "Could not load profile.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSellerReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          rating,
          comment,
          created_at,
          reviewer:profiles!reviews_reviewer_id_fkey(
            full_name,
            avatar_url
          )
        `
        )
        .eq("reviewed_id", sellerId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const fetchSellerProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", sellerId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching seller products:", error);
    }
  };

  const startConversation = async () => {
    if (!user || !seller) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to message this seller.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the consolidated conversation function
      const { data: conversationId, error } = await supabase.rpc(
        "find_or_create_consolidated_conversation",
        {
          p_buyer_id: user.id,
          p_seller_id: seller.user_id,
          p_product_id: null,
        }
      );

      if (error) throw error;

      // Navigate directly to chat page
      navigate(`/chat/${conversationId}`);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: "Could not start conversation.",
        variant: "destructive",
      });
    }
  };

  const submitReview = async () => {
    if (!user || !seller) {
      toast({
        title: "Sign in required",
        description: "Please login to review.",
        variant: "destructive",
      });
      return;
    }
    if (user.id === seller.user_id) {
      toast({
        title: "Not allowed",
        description: "You cannot review yourself.",
        variant: "destructive",
      });
      return;
    }
    if (ratingInput < 1 || ratingInput > 5) {
      toast({
        title: "Invalid rating",
        description: "Select 1 to 5 stars.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingReview(true);
    try {
      // Find a related order between reviewer and reviewed user
      const { data: order } = await supabase
        .from("orders")
        .select("id")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .or(`buyer_id.eq.${seller.user_id},seller_id.eq.${seller.user_id}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!order) {
        toast({
          title: "No order found",
          description: "You can only review users you have an order with.",
          variant: "destructive",
        });
        setSubmittingReview(false);
        return;
      }

      const { error } = await supabase.from("reviews").insert({
        order_id: order.id,
        reviewer_id: user.id,
        reviewed_id: seller.user_id,
        rating: ratingInput,
        comment: commentInput || null,
      });

      if (error) throw error;

      setRatingInput(0);
      setCommentInput("");
      fetchSellerReviews(); // Refresh reviews

      toast({
        title: "Review submitted",
        description: "Thanks for your feedback!",
      });
    } catch (err: any) {
      console.error("Error submitting review:", err);
      if (
        err.message?.includes("relation") ||
        err.message?.includes("does not exist")
      ) {
        toast({
          title: "Reviews not available",
          description: "Review system is not set up yet.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Could not submit review.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-flora-chip border-t-flora-leaf" />
            <p className="mt-4 text-flora-muted">Loading seller profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="rounded-3xl bg-flora-card p-8 text-center shadow-card">
            <User className="mx-auto mb-4 h-16 w-16 text-flora-muted" />
            <h2 className="mb-2 text-2xl font-bold text-flora-ink">Profile Not Found</h2>
            <p className="text-flora-muted">This profile is not available.</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if this is a buyer-only account
  if (seller.account_type === "buyer" || seller.seller_status !== "approved") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <div className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="max-w-md rounded-3xl bg-flora-card p-8 text-center shadow-card">
            <User className="mx-auto mb-4 h-16 w-16 text-flora-muted" />
            <h2 className="mb-2 text-2xl font-bold text-flora-ink">Buyer Account</h2>
            <p className="mb-4 text-flora-muted">
              This is a buyer's account and has no seller profile.
            </p>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="rounded-full border border-flora-ink/15 bg-white px-5 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <div className="py-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          {/* Seller Identity */}
          <div className="rounded-4xl bg-flora-card p-6 shadow-card sm:p-8">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:gap-6">
              <Avatar
                className="mx-auto h-20 w-20 cursor-pointer ring-4 ring-flora-chip transition hover:brightness-95 sm:mx-0 sm:h-24 sm:w-24"
                onClick={() => setShowAvatarModal(true)}
              >
                <AvatarImage
                  src={seller.avatar_url}
                  alt={seller.business_name || seller.full_name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-flora-chip text-base text-flora-ink sm:text-lg">
                  {getInitials(seller.business_name || seller.full_name)}
                </AvatarFallback>
              </Avatar>

              <div className="w-full flex-1 text-center sm:text-left">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="text-center sm:text-left">
                    <h1 className="break-words text-xl font-bold text-flora-ink sm:text-2xl md:text-3xl">
                      {seller.business_name || seller.full_name}
                    </h1>
                    {seller.business_name && (
                      <p className="mt-1 text-sm text-flora-muted">
                        By: {seller.full_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    {seller.is_verified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-flora-tagBg px-2.5 py-1 text-xs font-medium text-flora-tagText">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    )}
                    {gameBadge && gameBadge.is_premium && (
                      <PremiumGameBadge
                        level={gameBadge.overall_level}
                        badgeType={gameBadge.badge_type}
                        isPremium={gameBadge.is_premium}
                        size="sm"
                      />
                    )}
                    {(isSellerAdmin ||
                      seller?.user_id ===
                        "197cc55f-a224-4bcb-9f0c-f4abd3639626") && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-flora-ink px-2.5 py-1 text-xs font-medium text-white">
                        <Headphones className="h-3 w-3" />
                        Support
                      </span>
                    )}
                  </div>
                </div>

                <div className="mb-3 flex flex-col gap-2 text-flora-muted sm:flex-row sm:items-center sm:gap-4">
                  {(seller.university_name || seller.campus) && (
                    <div className="flex items-center justify-center gap-1 sm:justify-start">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate text-sm sm:text-base">
                        {seller.university_name || seller.campus}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-1 sm:justify-start">
                    <GraduationCap className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm sm:text-base">
                      {seller.university_name}
                    </span>
                  </div>
                  {seller.phone_number && (
                    <div className="flex items-center justify-center gap-1 sm:justify-start">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base">
                        {seller.phone_number}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mb-4 flex items-center justify-center gap-2 sm:justify-start sm:gap-4">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-flora-ink sm:text-base">
                      {seller.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-flora-muted sm:text-base">
                      ({seller.total_reviews} reviews)
                    </span>
                  </div>
                </div>

                {seller.bio && (
                  <p className="mb-4 break-words text-sm text-flora-muted sm:text-base">
                    {seller.bio}
                  </p>
                )}

                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  {user && user.id !== seller.user_id && (
                    <button
                      type="button"
                      onClick={startConversation}
                      className="inline-flex items-center gap-2 rounded-full bg-flora-ink px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Message Seller
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-5 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    {copied ? 'Copied!' : 'Share Profile'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="rounded-4xl bg-flora-card p-6 shadow-card sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-flora-ink sm:text-xl">
              <Package className="h-4 w-4 sm:h-5 sm:w-5 text-flora-leaf" />
              Products ({products.length})
            </h2>
            {products.length === 0 ? (
              <p className="py-8 text-center text-flora-muted">
                No products available.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 sm:gap-4">
                  {products.slice(0, visibleProducts).map((product) => (
                    <div
                      key={product.id}
                      className="cursor-pointer overflow-hidden rounded-3xl bg-white shadow-card transition hover:brightness-[0.98]"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <div className="relative">
                        {product.images && product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="h-32 w-full object-cover sm:h-40 md:h-48"
                          />
                        ) : (
                          <div className="h-32 w-full bg-flora-chip sm:h-40 md:h-48" />
                        )}
                        <span className="absolute left-1 top-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium capitalize text-flora-ink sm:left-2 sm:top-2">
                          {product.condition}
                        </span>
                      </div>
                      <div className="p-2 sm:p-3 md:p-4">
                        <h3 className="mb-1 line-clamp-2 min-h-[2.5rem] text-sm font-semibold text-flora-ink sm:mb-2 sm:text-base md:text-lg">
                          {product.title}
                        </h3>
                        <p className="mb-2 hidden line-clamp-2 text-xs text-flora-muted sm:block sm:text-sm">
                          {product.description}
                        </p>
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                          <span className="text-sm font-bold text-flora-leaf sm:text-base md:text-lg">
                            ₦{product.price.toLocaleString()}
                          </span>
                          <span className="w-fit rounded-full border border-flora-ink/15 px-2 py-0.5 text-xs text-flora-ink">
                            {product.category}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-flora-muted sm:mt-2">
                          {product.stock_quantity} available
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {visibleProducts < products.length && (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleProducts((prev) => prev + 10)}
                      className="rounded-full border border-flora-ink/15 bg-white px-5 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
                    >
                      Show More
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Reviews Section */}
          <div className="rounded-4xl bg-flora-card p-6 shadow-card sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-flora-ink sm:text-xl">
              <Star className="h-4 w-4 text-flora-leaf sm:h-5 sm:w-5" />
              Reviews ({reviews.length})
            </h2>
            {user && user.id !== seller.user_id && (
              <div className="mb-6 rounded-2xl border border-flora-ink/10 p-3 sm:p-4">
                <h4 className="mb-3 text-sm font-medium text-flora-ink sm:text-base">
                  Leave a Review
                </h4>
                <div className="mb-3 flex items-center gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      onClick={() => setRatingInput(i)}
                      className="touch-manipulation p-1"
                      aria-label={`Rate ${i} star`}
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 sm:h-5 sm:w-5",
                          i <= ratingInput
                            ? "fill-amber-400 text-amber-400"
                            : "text-flora-chip"
                        )}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Leave an optional comment"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="mb-3 border-flora-ink/15 bg-white text-sm text-flora-ink sm:text-base"
                  rows={3}
                />
                <button
                  type="button"
                  onClick={submitReview}
                  disabled={submittingReview || ratingInput === 0}
                  className="w-full rounded-full bg-flora-ink px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-50 sm:w-auto"
                >
                  {submittingReview ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            )}
            {reviews.length === 0 ? (
              <p className="py-8 text-center text-flora-muted">
                No reviews yet.
              </p>
            ) : (
              <div className="divide-y divide-flora-ink/10">
                {reviews.map((review) => (
                  <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={review.reviewer.avatar_url} />
                        <AvatarFallback className="bg-flora-chip text-xs text-flora-ink">
                          {getInitials(review.reviewer.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                          <span className="truncate text-sm font-medium text-flora-ink sm:text-base">
                            {review.reviewer.full_name}
                          </span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-flora-chip"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-flora-muted">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {review.comment && (
                          <p className="break-words text-sm text-flora-muted">
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
      </div>

      {/* Avatar Modal */}
      <Dialog open={showAvatarModal} onOpenChange={setShowAvatarModal}>
        <DialogContent className="max-w-md border-flora-ink/10 bg-flora-card text-flora-ink">
          <DialogHeader>
            <DialogTitle className="text-flora-ink">Profile Picture</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {seller.avatar_url ? (
              <img
                src={seller.avatar_url}
                alt={seller.full_name}
                className="max-h-96 max-w-full rounded-2xl object-contain"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-2xl bg-flora-chip">
                <span className="text-4xl text-flora-muted">
                  {getInitials(seller.full_name)}
                </span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SellerProfile;
