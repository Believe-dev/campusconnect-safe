import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Check
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
  };
}

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    if (product) {
      fetchSimilarProducts();
    }
  }, [product]);

  const fetchProduct = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (
            full_name,
            avatar_url,
            is_verified,
            rating,
            total_reviews
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setProduct(data);
      
      // Track product view
      if (data?.id) {
        await supabase.rpc('track_product_view', { p_product_id: data.id });
      }
    } catch (error) {
      console.error('Error fetching product:', error);
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
          profiles:seller_id (
            full_name,
            avatar_url,
            is_verified,
            rating,
            total_reviews
          )
        `)
        .eq('category', product.category)
        .eq('is_active', true)
        .neq('id', product.id)
        .limit(4);

      if (error) throw error;
      setSimilarProducts(data || []);
    } catch (error) {
      console.error('Error fetching similar products:', error);
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
      console.error('Error adding to cart:', error);
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
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('buyer_id', user.id)
        .eq('seller_id', product.seller_id)
        .eq('product_id', product.id)
        .single();

      if (existingConversation) {
        navigate(`/messages?conversation=${existingConversation.id}`);
        return;
      }

      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          buyer_id: user.id,
          seller_id: product.seller_id,
          product_id: product.id,
        })
        .select()
        .single();

      if (error) throw error;

      navigate(`/messages?conversation=${newConversation.id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
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
                    <Button variant="ghost" size="icon">
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleShare}>
                      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="outline">{product.category}</Badge>
                  <Badge variant="outline">{product.condition}</Badge>
                  {product.campus && (
                    <Badge variant="outline">
                      <MapPin className="h-3 w-3 mr-1" />
                      {product.campus}
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
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={product.seller?.avatar_url} />
                        <AvatarFallback className="bg-university-green text-white">
                          {product.seller?.full_name ? getInitials(product.seller.full_name) : 'S'}
                        </AvatarFallback>
                      </Avatar>
                      {product.seller?.is_verified && (
                        <div className="absolute -bottom-1 -right-1 bg-verified-blue rounded-full p-1">
                          <Shield className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-semibold">{product.seller?.full_name}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                          <span>{product.seller?.rating.toFixed(1)}</span>
                        </div>
                        <span>•</span>
                        <span>{product.seller?.total_reviews} reviews</span>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleStartChat} className="w-full mb-2" variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat with Seller
                  </Button>
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
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {similarProducts.map((similarProduct) => (
                  <ProductCard
                    key={similarProduct.id}
                     product={{
                       id: similarProduct.id,
                       title: similarProduct.title,
                       description: similarProduct.description || '',
                       price: similarProduct.price,
                       images: similarProduct.images || [],
                       category: similarProduct.category || '',
                       campus: similarProduct.campus || '',
                       condition: similarProduct.condition || 'good',
                        seller_id: similarProduct.seller_id || '',
                        seller: {
                          full_name: similarProduct.seller?.full_name || 'Unknown',
                          rating: similarProduct.seller?.rating || 0,
                          is_verified: similarProduct.seller?.is_verified || false,
                        },
                      }}
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