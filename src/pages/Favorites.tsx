import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  ShoppingCart, 
  MessageCircle, 
  Star, 
  MapPin, 
  Trash2,
  Package
} from 'lucide-react';
import Header from '@/components/layout/Header';

interface FavoriteProduct {
  id: string;
  product_id: string;
  created_at: string;
  products: {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    campus: string;
    condition: string;
    images: string[];
    is_active: boolean;
    stock_quantity: number;
    profiles: {
      full_name: string;
      rating: number;
      is_verified: boolean;
    };
  };
}

const Favorites = () => {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchFavorites();
  };

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('favorites')
        .select(`
          *,
          products!inner (
            *,
            profiles!products_seller_id_fkey (
              full_name,
              rating,
              is_verified,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('products.is_active', true)
        .order('created_at', { ascending: false });

      // Sort to prioritize verified sellers
      if (data) {
        data.sort((a, b) => {
          const aVerified = a.products?.profiles?.is_verified;
          const bVerified = b.products?.profiles?.is_verified;
          if (aVerified && !bVerified) return -1;
          if (!aVerified && bVerified) return 1;
          return 0;
        });
      }

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load favorites",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string, productTitle: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(favorites.filter(f => f.id !== favoriteId));
      toast({
        title: "Removed from Favorites",
        description: `${productTitle} has been removed from your favorites`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive",
      });
    }
  };

  const handleAddToCart = async (productId: string, productTitle: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if already in cart
      const { data: existingCart } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (existingCart) {
        // Update quantity
        const { error } = await supabase
          .from('cart')
          .update({ quantity: existingCart.quantity + 1 })
          .eq('id', existingCart.id);

        if (error) throw error;
      } else {
        // Add new item
        const { error } = await supabase
          .from('cart')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1
          });

        if (error) throw error;
      }

      toast({
        title: "Added to Cart",
        description: `${productTitle} has been added to your cart`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive",
      });
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'like_new':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'good':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'fair':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="space-y-2">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="aspect-square bg-muted rounded-lg"></div>
                  <div className="space-y-2 p-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-6 bg-muted rounded w-2/3"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">My Favorites</h1>
              <p className="text-muted-foreground">
                {favorites.length > 0 
                  ? `You have ${favorites.length} favorite item${favorites.length === 1 ? '' : 's'}`
                  : "You haven't added any favorites yet"
                }
              </p>
              {favorites.length > 0 && (
                <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
                  📌 Verified sellers' products are prioritized in your favorites
                </div>
              )}
            </div>
            {favorites.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Heart className="h-4 w-4 text-red-500" />
                <span>{favorites.length} items</span>
              </div>
            )}
          </div>
        </div>

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
              <p className="text-muted-foreground mb-6">
                Start browsing and add products to your favorites to see them here
              </p>
              <Button variant="brand" onClick={() => navigate('/marketplace')}>
                Browse Marketplace
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {favorites.map((favorite) => {
              const product = favorite.products;
              return (
                <Card 
                  key={favorite.id} 
                  className="group hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer border-border/50 hover:border-primary/20 flex flex-col"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="relative aspect-square overflow-hidden bg-muted">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-muted">
                        <Package className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Condition Badge */}
                    <Badge className={`absolute top-2 right-2 text-xs px-2 py-1 font-medium shadow-sm ${getConditionColor(product.condition)}`}>
                      {product.condition === 'like_new' ? 'Like New' : product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}
                    </Badge>

                    {/* Remove from Favorites Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFavorite(favorite.id, product.title);
                      }}
                      className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 shadow-md flex items-center justify-center"
                      title="Remove from favorites"
                    >
                      <Trash2 className="h-3 w-3 text-white" />
                    </button>

                    {/* Stock indicator */}
                    {product.stock_quantity === 0 && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white text-xs font-medium">Out of Stock</span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-2 flex-1 flex flex-col">
                    <div className="space-y-1 flex-1">
                      <h3 className="font-medium text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {product.title}
                      </h3>
                      
                      <div className="flex items-center gap-1 text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/seller/${product.profiles?.user_id || product.seller_id}`);
                          }}
                          className="text-primary hover:text-primary/80 font-medium underline underline-offset-2 hover:underline-offset-1 transition-all truncate"
                        >
                          {product.profiles?.full_name || 'Unknown'}
                        </button>
                        {product.profiles?.is_verified && (
                          <div className="bg-verified-blue rounded-full p-0.5 flex-shrink-0">
                            <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="font-bold text-base text-university-green">
                        ₦{product.price.toLocaleString()}
                      </div>

                      {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
                        <div className="flex items-center gap-1 text-xs text-warning">
                          <Package className="h-2.5 w-2.5" />
                          <span>{product.stock_quantity} left</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/messages');
                        }}
                        disabled={product.stock_quantity === 0}
                      >
                        <MessageCircle className="h-2.5 w-2.5" />
                      </Button>
                      <Button
                        variant="brand"
                        size="sm"
                        className="flex-1 text-xs h-7 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product.id, product.title);
                        }}
                        disabled={product.stock_quantity === 0}
                      >
                        <ShoppingCart className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Favorites;