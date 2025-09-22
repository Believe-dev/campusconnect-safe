import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/enhanced-button';
import { Separator } from '@/components/ui/separator';
import { Star, MessageCircle, MapPin, GraduationCap, ShieldCheck, User, Package, Heart, ShoppingCart, Phone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Textarea } from '@/components/ui/textarea';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

interface SellerProfile {
  id: string;
  user_id: string;
  full_name: string;
  university_name?: string; // Make optional since we're not exposing this publicly
  campus: string;
  bio: string;
  avatar_url: string;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  seller_status: string;
  phone_number?: string;
  created_at: string;
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
  const [commentInput, setCommentInput] = useState<string>('');
  const [visibleProducts, setVisibleProducts] = useState(5);

  useEffect(() => {
    if (sellerId) {
      fetchSellerProfile();
      fetchSellerReviews();
      fetchSellerProducts();
    }
  }, [sellerId]);

  const fetchSellerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
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
          created_at
        `)
        .eq('user_id', sellerId)
        .single();

      if (error) throw error;
      setSeller(data);
    } catch (error) {
      console.error('Error fetching seller profile:', error);
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
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          reviewer:profiles!reviews_reviewer_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('reviewed_id', sellerId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchSellerProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching seller products:', error);
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
        'find_or_create_consolidated_conversation',
        {
          p_buyer_id: user.id,
          p_seller_id: seller.user_id,
          p_product_id: null
        }
      );

      if (error) throw error;

      const draftMessage = `Hi! I'm interested in your products. Can you tell me more about what you have available?`;
      navigate(`/messages?conversation=${conversationId}&draft=${encodeURIComponent(draftMessage)}`);
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: "Could not start conversation.",
        variant: "destructive",
      });
    }
  };

  const submitReview = async () => {
    if (!user || !seller) {
      toast({ title: 'Sign in required', description: 'Please login to review.', variant: 'destructive' });
      return;
    }
    if (user.id === seller.user_id) {
      toast({ title: 'Not allowed', description: 'You cannot review yourself.', variant: 'destructive' });
      return;
    }
    if (ratingInput < 1 || ratingInput > 5) {
      toast({ title: 'Invalid rating', description: 'Select 1 to 5 stars.' , variant: 'destructive'});
      return;
    }

    setSubmittingReview(true);
    try {
      // Find a related order between reviewer and reviewed user
      const { data: order } = await supabase
        .from('orders')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .or(`buyer_id.eq.${seller.user_id},seller_id.eq.${seller.user_id}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!order) {
        toast({ title: 'No order found', description: 'You can only review users you have an order with.' , variant: 'destructive'});
        setSubmittingReview(false);
        return;
      }

      const { error } = await supabase
        .from('reviews')
        .insert({
          order_id: order.id,
          reviewer_id: user.id,
          reviewed_id: seller.user_id,
          rating: ratingInput,
          comment: commentInput || null
        });

      if (error) throw error;

      setRatingInput(0);
      setCommentInput('');
      fetchSellerReviews(); // Refresh reviews

      toast({ title: 'Review submitted', description: 'Thanks for your feedback!' });
    } catch (err: any) {
      console.error('Error submitting review:', err);
      if (err.message?.includes('relation') || err.message?.includes('does not exist')) {
        toast({ title: 'Reviews not available', description: 'Review system is not set up yet.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Could not submit review.', variant: 'destructive' });
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-university-green"></div>
            <p className="mt-4 text-muted-foreground">Loading seller profile...</p>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="text-center p-8">
            <CardContent>
              <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground">This profile is not available.</p>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  // Check if this is a buyer-only account
  if (seller.account_type === 'buyer' || seller.seller_status !== 'approved') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="text-center p-8 max-w-md">
            <CardContent>
              <User className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">Buyer Account</h2>
              <p className="text-muted-foreground mb-4">
                This is a buyer's account and has no seller profile.
              </p>
              <Button onClick={() => window.history.back()} variant="outline">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="py-8 pb-20 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Seller Info Card */}
        <Card className="shadow-brand">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 mx-auto sm:mx-0">
                <AvatarImage src={seller.avatar_url} alt={seller.full_name} />
                <AvatarFallback className="text-base sm:text-lg">
                  {getInitials(seller.full_name)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 text-center sm:text-left w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">{seller.full_name}</h1>
                  {seller.is_verified && (
                    <div className="trust-badge mx-auto sm:mx-0">
                      <div className="verification-badge-inline">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-xs font-medium">Verified</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-muted-foreground mb-3">
                  {(seller.university_name || seller.campus) && (
                    <div className="flex items-center gap-1 justify-center sm:justify-start">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base truncate">{seller.university_name || seller.campus}</span>
                    </div>
                  )}
                  {seller.phone_number && (
                    <div className="flex items-center gap-1 justify-center sm:justify-start">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{seller.phone_number}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 sm:gap-4 mb-4 justify-center sm:justify-start">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-sm sm:text-base">{seller.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground text-sm sm:text-base">({seller.total_reviews} reviews)</span>
                  </div>
                </div>
                
                {seller.bio && (
                  <p className="text-muted-foreground mb-4 text-sm sm:text-base break-words">{seller.bio}</p>
                )}
                
                {user && user.id !== seller.user_id && (
                  <Button onClick={startConversation} className="flex items-center gap-2 w-full sm:w-auto">
                    <MessageCircle className="h-4 w-4" />
                    Message Seller
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Products Section */}
        <Card className="shadow-brand">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              Products ({products.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {products.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No products available.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
                  {products.slice(0, visibleProducts).map((product) => (
                    <Card 
                      key={product.id} 
                      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      <div className="relative">
                        {product.images && product.images[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-32 sm:h-40 md:h-48 object-cover"
                          />
                        )}
                        <Badge 
                          className="absolute top-1 left-1 sm:top-2 sm:left-2 text-xs"
                          variant={product.condition === 'new' ? 'default' : 'secondary'}
                        >
                          {product.condition}
                        </Badge>
                      </div>
                      <CardContent className="p-2 sm:p-3 md:p-4">
                        <h3 className="font-semibold text-sm sm:text-base md:text-lg mb-1 sm:mb-2 line-clamp-2 min-h-[2.5rem]">{product.title}</h3>
                        <p className="text-muted-foreground text-xs sm:text-sm mb-2 line-clamp-2 hidden sm:block">{product.description}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                          <span className="text-sm sm:text-base md:text-lg font-bold text-primary">₦{product.price.toLocaleString()}</span>
                          <Badge variant="outline" className="text-xs w-fit">{product.category}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 sm:mt-2">
                          {product.stock_quantity} available
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {visibleProducts < products.length && (
                  <div className="text-center mt-6">
                    <Button 
                      variant="outline" 
                      onClick={() => setVisibleProducts(prev => prev + 10)}
                    >
                      Show More
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Reviews Section */}
        <Card className="shadow-brand">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Star className="h-4 w-4 sm:h-5 sm:w-5" />
              Reviews ({reviews.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {user && user.id !== seller.user_id && (
              <div className="mb-6 border rounded-md p-3 sm:p-4">
                <h4 className="font-medium mb-3 text-sm sm:text-base">Leave a Review</h4>
                <div className="flex items-center gap-1 sm:gap-2 mb-3">
                  {[1,2,3,4,5].map(i => (
                    <button
                      key={i}
                      onClick={() => setRatingInput(i)}
                      className="p-1 touch-manipulation"
                      aria-label={`Rate ${i} star`}
                    >
                      <Star className={`h-6 w-6 sm:h-5 sm:w-5 ${i <= ratingInput ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Leave an optional comment"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="mb-3 text-sm sm:text-base"
                  rows={3}
                />
                <Button 
                  onClick={submitReview} 
                  disabled={submittingReview || ratingInput === 0}
                  className="w-full sm:w-auto"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            )}
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={review.reviewer.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(review.reviewer.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                          <span className="font-medium text-sm sm:text-base truncate">{review.reviewer.full_name}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        
                        {review.comment && (
                          <p className="text-sm text-muted-foreground break-words">{review.comment}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default SellerProfile;