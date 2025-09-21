import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  Share2, 
  MessageCircle, 
  ShoppingCart, 
  Star, 
  MapPin, 
  Package,
  Shield,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Flag
} from 'lucide-react';
import Header from '@/components/layout/Header';
import ProductCard from '@/components/marketplace/ProductCard';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  campus?: string;
  condition: string;
  images?: string[];
  seller_id: string;
  stock_quantity: number;
  created_at: string;
  seller?: {
    full_name: string;
    avatar_url?: string;
    is_verified: boolean;
    rating: number;
    total_reviews: number;
    campus?: string;
    phone?: string;
    email?: string;
  };
}

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    if (product) {
      fetchSimilarProducts();
      checkFavoriteStatus();
    }
  }, [product]);

  const fetchProduct = async () => {
    try {
      const { data: productData, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        // Secure error logging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[PRODUCT_FETCH_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
        throw error;
      }

      // Fetch seller info separately
      const { data: sellerData } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, is_verified, rating, total_reviews, campus, phone_number, email')
        .eq('user_id', productData.seller_id)
        .single();

      const data = {
        ...productData,
        seller: sellerData
      };

      // Product loaded successfully
      setProduct(data);
      
      // Track product view
      if (data?.id) {
        await supabase.rpc('track_product_view', { p_product_id: data.id });
      }
    } catch (error) {
      // Secure error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PRODUCT_DETAILS_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilarProducts = async () => {
    if (!product) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles!products_seller_id_fkey (
            full_name,
            avatar_url,
            is_verified,
            rating,
            total_reviews,
            campus
          )
        `)
        .eq('category', product.category)
        .neq('id', product.id)
        .limit(4);

      if (error) throw error;
      
      // Transform data to match expected structure
      const transformedData = (data || []).map(item => ({
        ...item,
        seller: item.profiles
      }));
      
      setSimilarProducts(transformedData);
    } catch (error) {
      // Secure error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SIMILAR_PRODUCTS_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
    } finally {
      setSimilarLoading(false);
    }
  };

  const handleAddToCart = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!product) return;

    try {
      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (existingItem) {
        // Update quantity if item exists
        const { error } = await supabase
          .from('cart')
          .update({ 
            quantity: existingItem.quantity + quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Insert new item to cart
        const { error } = await supabase
          .from('cart')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: quantity
          });

        if (error) throw error;
      }

      toast({
        title: "Added to Cart",
        description: `${quantity} item(s) added to your cart`,
      });
    } catch (error) {
      // Secure error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CART_ADD_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const handleStartChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!product) return;

    try {
      // Use the same function as ProductCard to find or create consolidated conversation
      const { data: conversationId, error } = await supabase.rpc(
        'find_or_create_conversation',
        {
          p_buyer_id: user.id,
          p_seller_id: product.seller_id,
          p_product_id: product.id
        }
      );

      if (error) throw error;

      const draftMessage = `Hi! I'm interested in your ${product.title} listed for ₦${product.price.toLocaleString()}. Is it still available?`;
      navigate(`/messages?conversation=${conversationId}&draft=${encodeURIComponent(draftMessage)}`);
    } catch (error) {
      // Secure error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CHAT_START_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = product?.title || 'Check out this product';
    const text = `${title} - ₦${product?.price.toLocaleString()}`;

    // Try Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      } catch (error) {
        // Fallback to copy link if share is cancelled or fails
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Product link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
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

  const checkFavoriteStatus = async () => {
    if (!product) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      setIsFavorited(!!data);
    } catch (error) {
      // Not favorited or error - default to false
      setIsFavorited(false);
    }
  };

  const handleToggleFavorite = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!product) return;

    setFavoriteLoading(true);
    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);

        if (error) throw error;

        setIsFavorited(false);
        toast({
          title: "Removed from Favorites",
          description: "Product removed from your favorites",
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            product_id: product.id
          });

        if (error) throw error;

        setIsFavorited(true);
        toast({
          title: "Added to Favorites",
          description: "Product added to your favorites",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[FAVORITE_TOGGLE_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleReportIssue = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!product || !reportReason.trim() || !reportDescription.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create product report
      const { error: reportError } = await supabase
        .from('product_reports')
        .insert({
          product_id: product.id,
          reported_by: user.id,
          reason: reportReason,
          description: reportDescription,
          status: 'pending'
        });

      if (reportError) throw reportError;

      // Send notification to seller
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: product.seller_id,
          title: 'Product Issue Reported',
          message: `A user has reported an issue with your product "${product.title}". Reason: ${reportReason}`,
          type: 'warning'
        });

      if (notificationError) {
        // Secure error logging
        const errorMessage = notificationError instanceof Error ? notificationError.message : 'Unknown error';
        console.error('[NOTIFICATION_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
      }

      // Notify admins
      const { data: admins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            user_id: admin.user_id,
            title: 'Product Report Received',
            message: `Product "${product.title}" has been reported for: ${reportReason}`,
            type: 'info'
          });
        }
      }

      toast({
        title: "Report Submitted",
        description: "Your report has been submitted and the seller has been notified.",
      });

      setReportDialogOpen(false);
      setReportReason('');
      setReportDescription('');
    } catch (error) {
      // Secure error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[REPORT_SUBMIT_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="aspect-square bg-muted rounded-lg"></div>
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
                <div className="h-6 bg-muted rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!product) return null;

  const images = product.images && product.images.length > 0 ? product.images : ['/placeholder.svg'];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                <img
                  src={images[currentImageIndex]}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex(Math.max(0, currentImageIndex - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 p-2 rounded-full"
                      disabled={currentImageIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex(Math.min(images.length - 1, currentImageIndex + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 p-2 rounded-full"
                      disabled={currentImageIndex === images.length - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 overflow-hidden rounded border-2 ${
                        index === currentImageIndex ? 'border-primary' : 'border-transparent'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.title} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-3xl font-bold text-primary">{product.title}</h1>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleToggleFavorite}
                      disabled={favoriteLoading}
                    >
                      <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleShare}>
                      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    </Button>
                    <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" title="Report Issue">
                          <Flag className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Report Issue with Product</DialogTitle>
                          <DialogDescription>
                            Report any issues with this product. The seller will be notified.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="reason">Reason for Report</Label>
                            <Select value={reportReason} onValueChange={setReportReason}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a reason" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="misleading_description">Misleading Description</SelectItem>
                                <SelectItem value="wrong_price">Wrong Price</SelectItem>
                                <SelectItem value="fake_product">Fake/Counterfeit Product</SelectItem>
                                <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                                <SelectItem value="spam">Spam</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              placeholder="Please provide more details about the issue..."
                              value={reportDescription}
                              onChange={(e) => setReportDescription(e.target.value)}
                              rows={4}
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button onClick={handleReportIssue}>
                              Submit Report
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline">{product.category}</Badge>
                  <Badge variant="outline">{product.condition}</Badge>
                  {(product.seller?.campus || product.campus) && (
                    <Badge variant="outline">
                      <MapPin className="h-3 w-3 mr-1" />
                      {product.seller?.campus || product.campus}
                    </Badge>
                  )}
                </div>

                <p className="text-3xl font-bold text-university-green mb-2">
                  ₦{product.price.toLocaleString()}
                </p>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Package className="h-4 w-4" />
                    {product.stock_quantity} available
                  </span>
                  <span>
                    Listed {new Date(product.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {product.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{product.description}</p>
                </div>
              )}

              {/* Seller Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="mb-4">
                    <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Seller Information
                    </h3>
                    
                    <div className="flex items-start gap-3 mb-4">
                      <div className="relative cursor-pointer" onClick={() => navigate(`/seller/${product.seller_id}`)}>
                        <Avatar className="h-16 w-16 hover:ring-2 hover:ring-primary/20 transition-all">
                          <AvatarImage src={product.seller?.avatar_url} />
                          <AvatarFallback className="bg-university-green text-white text-lg">
                            {product.seller?.full_name ? getInitials(product.seller.full_name) : 'S'}
                          </AvatarFallback>
                        </Avatar>
                        {product.seller?.is_verified && (
                          <div className="verification-tick">
                            <svg fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg cursor-pointer hover:text-primary transition-colors underline" onClick={() => navigate(`/seller/${product.seller_id}`)}>{product.seller?.full_name}</h4>
                          {product.seller?.is_verified && (
                            <div className="trust-badge">
                              <div className="verification-badge-inline">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <span className="text-xs font-medium">Verified</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{product.seller?.rating?.toFixed(1) || '0.0'}</span>
                            <span className="text-muted-foreground">({product.seller?.total_reviews || 0} reviews)</span>
                          </div>
                        </div>
                        
                        {(product.seller?.campus || product.campus) && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>Campus: {product.seller?.campus || product.campus}</span>
                          </div>
                        )}
                        
                        <div className="text-sm text-muted-foreground">
                          Member since {new Date(product.created_at).getFullYear()}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button onClick={handleStartChat} className="w-full" variant="outline">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat with Seller
                    </Button>
                    
                    <div className="text-xs text-center text-muted-foreground">
                      Safe transactions • Secure messaging • Campus verified
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Purchase Actions */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Quantity:</label>
                  <select
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value))}
                    className="border rounded px-3 py-1"
                  >
                    {Array.from({ length: Math.min(5, product.stock_quantity) }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <Button onClick={handleAddToCart} className="w-full" size="lg">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </div>

          {/* Similar Products Section */}
          {!similarLoading && similarProducts.length > 0 && (
            <div className="mt-16">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-primary mb-2">Similar Products</h2>
                <p className="text-muted-foreground">You might also like these items in {product.category}</p>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                {similarProducts.map((similarProduct) => (
                  <ProductCard
                    key={similarProduct.id}
                    product={similarProduct}
                    onViewProduct={(productId) => navigate(`/product/${productId}`)}
                    isAuthenticated={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProductDetails;