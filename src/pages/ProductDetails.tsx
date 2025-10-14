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
import ProductCard from '@/components/marketplace/ProductCard';
import { ProductReviews } from '@/components/reviews/ProductReviews';
import { ProductSEO } from '@/components/common/ProductSEO';


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
  const [isAutoSliding, setIsAutoSliding] = useState(true);
  const [loading, setLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
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
      checkCartStatus();
    }
  }, [product]);

  // Auto-slide functionality
  useEffect(() => {
    if (!product || !product.images || product.images.length <= 1 || !isAutoSliding) return;

    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % product.images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [product, isAutoSliding]);

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsAutoSliding(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && currentImageIndex < images.length - 1) {
      setCurrentImageIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentImageIndex > 0) {
      setCurrentImageIndex(prev => prev - 1);
    }
    setTimeout(() => setIsAutoSliding(true), 5000);
  };

  const fetchProduct = async () => {
    try {
      const { data: productData, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
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
      // Error handled silently
    } finally {
      setSimilarLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (isInCart) return; // Prevent action if already in cart
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Store current product URL for redirect after login
      localStorage.setItem('redirect_after_auth', window.location.pathname);
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
        // Check if adding more would exceed stock
        if (existingItem.quantity + quantity > product.stock_quantity) {
          toast({
            title: "Stock Limit Exceeded",
            description: `Only ${product.stock_quantity - existingItem.quantity} more items available`,
            variant: "destructive",
          });
          return;
        }

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
        // Check if requested quantity exceeds stock
        if (quantity > product.stock_quantity) {
          toast({
            title: "Stock Limit Exceeded",
            description: `Only ${product.stock_quantity} items available`,
            variant: "destructive",
          });
          return;
        }

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

      setIsInCart(true);
      toast({
        title: "Added to Cart",
        description: `${quantity} item(s) added to your cart`,
      });
    } catch (error) {
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

    // Always try Web Share API first on mobile
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
        return;
      } catch (error) {
        // User cancelled or error occurred, don't fallback
        if (error.name === 'AbortError') {
          return; // User cancelled, don't show error
        }
      }
    }

    // Fallback: Copy to clipboard only if Web Share API is not available
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Product link has been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Share Link",
        description: url,
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

  const checkCartStatus = async () => {
    if (!product) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('cart')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      setIsInCart(!!data);
    } catch (error) {
      // Not in cart or error - default to false
      setIsInCart(false);
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
        // Error handled silently
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Dynamic SEO Meta Tags */}
      {product && <ProductSEO product={product} />}
      
      <main className="container mx-auto px-4 py-6 sm:py-8 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Image Gallery */}
            <div className="space-y-3 sm:space-y-4">
              <div 
                className="relative aspect-square overflow-hidden rounded-xl bg-muted shadow-lg"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseEnter={() => setIsAutoSliding(false)}
                onMouseLeave={() => setIsAutoSliding(true)}
              >
                <img
                  src={images[currentImageIndex]}
                  alt={product.title}
                  className="h-full w-full object-cover transition-all duration-300"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder.svg';
                  }}
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        setCurrentImageIndex(currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1);
                        setIsAutoSliding(false);
                        setTimeout(() => setIsAutoSliding(true), 5000);
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setCurrentImageIndex(currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1);
                        setIsAutoSliding(false);
                        setTimeout(() => setIsAutoSliding(true), 5000);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all duration-200"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    
                    {/* Image counter */}
                    <div className="absolute bottom-3 right-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-medium">
                      {currentImageIndex + 1} / {images.length}
                    </div>
                    
                    {/* Slide indicators */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setCurrentImageIndex(index);
                            setIsAutoSliding(false);
                            setTimeout(() => setIsAutoSliding(true), 5000);
                          }}
                          className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentImageIndex(index);
                        setIsAutoSliding(false);
                        setTimeout(() => setIsAutoSliding(true), 5000);
                      }}
                      className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                        index === currentImageIndex 
                          ? 'border-university-green shadow-md' 
                          : 'border-gray-200 hover:border-university-green/50'
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
            <div className="space-y-4 sm:space-y-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">{product.title}</h1>
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleToggleFavorite}
                        disabled={favoriteLoading}
                        className="h-8 w-8 sm:h-10 sm:w-10"
                      >
                        <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleShare} className="h-8 w-8 sm:h-10 sm:w-10">
                        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                      </Button>
                      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Report Issue" className="h-8 w-8 sm:h-10 sm:w-10">
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
                            <div className="flex flex-col gap-3">
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setReportDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleReportIssue}>
                                  Submit Report
                                </Button>
                              </div>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-2">Need immediate help?</p>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => window.open('https://wa.me/2349133054018', '_blank')}
                                  className="text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  Chat on WhatsApp
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className="bg-university-green/10 text-university-green border-university-green/20">{product.category}</Badge>
                    <Badge className={`${
                      product.condition === 'new' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>{product.condition}</Badge>
                    {(product.seller?.campus || product.campus) && (
                      <Badge variant="outline" className="bg-gray-50">
                        <MapPin className="h-3 w-3 mr-1" />
                        {product.seller?.campus || product.campus}
                      </Badge>
                    )}
                  </div>

                  <div className="text-2xl sm:text-3xl font-bold text-university-green mb-3">
                    ₦{product.price.toLocaleString()}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      {product.stock_quantity} available
                    </span>
                    <span>
                      Listed {new Date(product.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {product.description && (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-4 sm:p-6">
                    <h3 className="font-semibold text-lg mb-3">Description</h3>
                    <p className="text-gray-700 leading-relaxed">{product.description}</p>
                  </CardContent>
                </Card>
              )}

              {/* Seller Info */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4 sm:p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Seller Information
                  </h3>
                  
                  <div className="flex items-start gap-3 mb-4">
                    <div className="relative cursor-pointer" onClick={() => navigate(`/seller/${product.seller_id}`)}>
                      <Avatar className="h-12 w-12 sm:h-16 sm:w-16 hover:ring-2 hover:ring-university-green/20 transition-all">
                        <AvatarImage src={product.seller?.avatar_url} />
                        <AvatarFallback className="bg-university-green text-white text-sm sm:text-lg">
                          {product.seller?.full_name ? getInitials(product.seller.full_name) : 'S'}
                        </AvatarFallback>
                      </Avatar>
                      {product.seller?.is_verified && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="h-3 w-3 sm:h-4 sm:w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base sm:text-lg cursor-pointer hover:text-university-green transition-colors underline truncate" onClick={() => navigate(`/seller/${product.seller_id}`)}>{product.seller?.full_name}</h4>
                        {product.seller?.is_verified && (
                          <Badge className="bg-blue-500 text-white text-xs px-2 py-1">
                            Verified
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{product.seller?.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-gray-500">({product.seller?.total_reviews || 0} reviews)</span>
                      </div>
                      
                      {(product.seller?.campus || product.campus) && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>Campus: {product.seller?.campus || product.campus}</span>
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-500">
                        Member since {new Date(product.created_at).getFullYear()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button onClick={handleStartChat} className="w-full bg-university-green hover:bg-university-green/90">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat with Seller
                    </Button>
                    
                    <div className="text-xs text-center text-gray-500 bg-gray-50 p-2 rounded-lg">
                      🔒 Safe transactions • 💬 Secure messaging • ✅ Campus verified
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Purchase Actions */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium">Quantity:</label>
                      <select
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="border-2 border-gray-200 rounded-lg px-3 py-2 focus:border-university-green focus:outline-none"
                      >
                        {Array.from({ length: Math.min(5, product.stock_quantity) }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <Package className="h-4 w-4 flex-shrink-0" />
                        <span>You will pay your delivery fee to the driver on delivery</span>
                      </div>
                      <Button 
                        onClick={handleAddToCart} 
                        className="w-full" 
                        size="lg" 
                        variant={isInCart ? "outline" : "default"}
                        disabled={isInCart}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        {isInCart ? "✓ In Cart" : "Add to Cart"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Product Reviews Section */}
          <div className="mt-8">
            <ProductReviews productId={product.id} sellerId={product.seller_id} />
          </div>

          {/* Similar Products Section */}
          {!similarLoading && similarProducts.length > 0 && (
            <div className="mt-12">
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Similar Products</h2>
                    <p className="text-gray-600">You might also like these items in {product.category}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {similarProducts.map((similarProduct) => (
                      <Card
                        key={similarProduct.id}
                        className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden border-0 shadow-sm bg-white"
                        onClick={() => navigate(`/product/${similarProduct.id}`)}
                      >
                        <div className="relative">
                          {similarProduct.images && similarProduct.images[0] ? (
                            <img
                              src={similarProduct.images[0]}
                              alt={similarProduct.title}
                              className="w-full h-32 sm:h-36 lg:h-40 object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg";
                              }}
                            />
                          ) : (
                            <div className="w-full h-32 sm:h-36 lg:h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                              <Package className="h-8 w-8 text-gray-400" />
                            </div>
                          )}
                          
                          {/* Condition Badge */}
                          <div className="absolute top-2 left-2">
                            <Badge
                              className={`text-xs px-1.5 py-0.5 font-medium ${
                                similarProduct.condition === "new"
                                  ? "bg-green-500 text-white border-0"
                                  : "bg-blue-500 text-white border-0"
                              }`}
                            >
                              {similarProduct.condition.charAt(0).toUpperCase() +
                                similarProduct.condition.slice(1)}
                            </Badge>
                          </div>
                          
                          {/* Verified Seller Badge */}
                          {similarProduct.seller?.is_verified && (
                            <div className="absolute bottom-2 left-2">
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                                <svg
                                  className="h-3 w-3 text-white"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>

                        <CardContent className="p-3">
                          <div className="space-y-2">
                            {/* Title */}
                            <h3 className="font-semibold text-sm line-clamp-2 text-gray-900 leading-tight">
                              {similarProduct.title}
                            </h3>
                            
                            {/* Category */}
                            <Badge variant="outline" className="text-xs bg-gray-50 border-gray-200 w-fit">
                              {similarProduct.category}
                            </Badge>
                            
                            {/* Seller Info */}
                            <div
                              className="flex items-center gap-1.5 p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/seller/${similarProduct.seller_id}`);
                              }}
                            >
                              <div className="w-4 h-4 bg-university-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-university-green">
                                  {similarProduct.seller?.full_name?.charAt(0) || "U"}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-university-green hover:underline truncate flex-1">
                                {similarProduct.seller?.full_name || "Unknown"}
                              </span>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs text-gray-600">
                                  {similarProduct.seller?.rating?.toFixed(1) || "0.0"}
                                </span>
                              </div>
                            </div>

                            {/* Price */}
                            <div className="text-base font-bold text-university-green">
                              ₦{similarProduct.price.toLocaleString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
      

    </div>
  );
};

export default ProductDetails;