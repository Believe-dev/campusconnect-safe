import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Heart, 
  ShoppingCart, 
  Search, 
  Filter,
  Star,
  MapPin,
  Package,
  Shield
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { OfflineNotice } from '@/components/ui/offline-notice';
import { User } from '@supabase/supabase-js';
import { searchProducts } from '@/utils/searchUtils';

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  stock_quantity: number;
  condition: string;
  campus: string;
  images: string[];
  seller_id: string;
  created_at: string;
  profiles: {
    full_name: string;
    rating: number;
    is_verified: boolean;
  };
}

const categories = [
  'All Categories',
  'Books & Textbooks',
  'Electronics',
  'Fashion & Accessories',
  'Food & Beverages',
  'Services',
  'Sports & Recreation',
  'Home & Living',
  'Other'
];

const conditions = ['All Conditions', 'new', 'excellent', 'good', 'fair'];

const Marketplace = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userUniversity, setUserUniversity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedCondition, setSelectedCondition] = useState('All Conditions');
  const [sortBy, setSortBy] = useState('newest');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchUserData(user.id);
        // Removed university fetching
      }
    });

    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory, selectedCondition, sortBy]);

  const fetchProducts = async () => {
    try {
      // Optimize for slow connections - fetch only essential fields
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          description,
          category,
          price,
          stock_quantity,
          condition,
          campus,
          images,
          seller_id,
          created_at,
          profiles!products_seller_id_fkey (
            full_name,
            rating,
            is_verified,
            campus
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      // Secure error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PRODUCTS_FETCH_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch favorites
      const { data: favoritesData } = await supabase
        .from('favorites')
        .select('product_id')
        .eq('user_id', userId);

      if (favoritesData) {
        setFavorites(new Set(favoritesData.map(f => f.product_id)));
      }

      // Fetch cart
      const { data: cartData } = await supabase
        .from('cart')
        .select('product_id')
        .eq('user_id', userId);

      if (cartData) {
        setCart(new Set(cartData.map(c => c.product_id)));
      }
    } catch (error) {
      // Secure error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[USER_DATA_FETCH_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
    }
  };

  // Removed university fetching to show all products

  const filterProducts = () => {
    let filtered = [...products];

    // Enhanced search filter with synonyms
    if (searchQuery) {
      filtered = searchProducts(filtered, searchQuery);
    }

    // Category filter
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Condition filter
    if (selectedCondition !== 'All Conditions') {
      filtered = filtered.filter(product => product.condition === selectedCondition);
    }

    // Show all products without university prioritization
    // Removed university-specific filtering to show all products

    // Sort with verified sellers first
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => {
          const aVerified = a.profiles?.is_verified;
          const bVerified = b.profiles?.is_verified;
          
          if (aVerified && !bVerified) return -1;
          if (!aVerified && bVerified) return 1;
          return a.price - b.price;
        });
        break;
      case 'price_high':
        filtered.sort((a, b) => {
          const aVerified = a.profiles?.is_verified;
          const bVerified = b.profiles?.is_verified;
          
          if (aVerified && !bVerified) return -1;
          if (!aVerified && bVerified) return 1;
          return b.price - a.price;
        });
        break;
      case 'newest':
        filtered.sort((a, b) => {
          const aVerified = a.profiles?.is_verified;
          const bVerified = b.profiles?.is_verified;
          
          if (aVerified && !bVerified) return -1;
          if (!aVerified && bVerified) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        break;
      case 'oldest':
        filtered.sort((a, b) => {
          const aVerified = a.profiles?.is_verified;
          const bVerified = b.profiles?.is_verified;
          
          if (aVerified && !bVerified) return -1;
          if (!aVerified && bVerified) return 1;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        break;
    }

    setFilteredProducts(filtered);
  };

  const toggleFavorite = async (productId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add favorites",
        variant: "destructive",
      });
      return;
    }

    try {
      const isFavorited = favorites.has(productId);
      
      if (isFavorited) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);

        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(productId);
          return newSet;
        });

        toast({
          title: "Removed from favorites",
          description: "Product removed from your favorites",
        });
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, product_id: productId });

        setFavorites(prev => new Set([...prev, productId]));

        toast({
          title: "Added to favorites",
          description: "Product added to your favorites",
        });
      }

      // Update analytics
      await updateAnalytics(productId, 'favorites_count', isFavorited ? -1 : 1);
    } catch (error) {
      // Secure error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[FAVORITE_TOGGLE_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    }
  };

  const addToCart = async (productId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    try {
      const isInCart = cart.has(productId);
      
      if (isInCart) {
        toast({
          title: "Already in cart",
          description: "This item is already in your cart",
        });
        return;
      }

      await supabase
        .from('cart')
        .insert({ user_id: user.id, product_id: productId, quantity: 1 });

      setCart(prev => new Set([...prev, productId]));

      toast({
        title: "Added to cart",
        description: "Product added to your cart",
      });

      // Update analytics
      await updateAnalytics(productId, 'cart_additions', 1);
    } catch (error) {
      // Secure error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CART_ADD_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive",
      });
    }
  };

  const updateAnalytics = async (productId: string, field: string, increment: number) => {
    try {
      // First try to get existing analytics
      const { data: existing } = await supabase
        .from('product_analytics')
        .select(field)
        .eq('product_id', productId)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from('product_analytics')
          .update({ 
            [field]: Math.max(0, existing[field] + increment),
            last_updated: new Date().toISOString()
          })
          .eq('product_id', productId);
      } else {
        // Create new analytics entry
        await supabase
          .from('product_analytics')
          .insert({ 
            product_id: productId,
            [field]: Math.max(0, increment)
          });
      }
    } catch (error) {
      // Secure error logging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ANALYTICS_UPDATE_ERROR]', errorMessage.replace(/[\r\n]/g, ''));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg h-64 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 sm:py-8 pb-20 md:pb-8">
        <OfflineNotice />
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-2">Marketplace</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Discover products from students across all universities
          </p>
        </div>

            {/* Filters */}
            <Card className="mb-4 sm:mb-6 lg:mb-8">
              <CardContent className="p-3 sm:p-4 lg:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.blur();
                      }
                    }}
                    className="pl-10 pr-12 text-sm sm:text-base"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      document.activeElement?.blur();
                      filterProducts();
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 px-3 z-10 hover:scale-100 hover:translate-y-[-50%]"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="text-sm sm:text-base">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category} className="text-sm sm:text-base">{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                <SelectTrigger className="text-sm sm:text-base">
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map(condition => (
                    <SelectItem key={condition} value={condition} className="text-sm sm:text-base">
                      {condition === 'All Conditions' ? condition : condition.charAt(0).toUpperCase() + condition.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="text-sm sm:text-base">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest" className="text-sm sm:text-base">Newest First</SelectItem>
                  <SelectItem value="oldest" className="text-sm sm:text-base">Oldest First</SelectItem>
                  <SelectItem value="price_low" className="text-sm sm:text-base">Price: Low to High</SelectItem>
                  <SelectItem value="price_high" className="text-sm sm:text-base">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="mb-3 sm:mb-4 lg:mb-6">
          <p className="text-xs sm:text-sm lg:text-base text-muted-foreground">
            Showing <span className="font-medium">{filteredProducts.length}</span> products
          </p>
          <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
            📌 Verified sellers' products are shown first in all listings
          </div>
        </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-6 sm:p-8 lg:p-12 text-center">
              <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">No products found</h3>
              <p className="text-sm sm:text-base text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="group hover:shadow-lg transition-smooth cursor-pointer overflow-hidden"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="relative">
                  {product.images && product.images[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-32 sm:h-40 lg:h-48 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300 ease-out"
                    />
                  )}
                  
                  {/* Favorite Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-white/90 hover:bg-white h-7 w-7 sm:h-8 sm:w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product.id);
                    }}
                  >
                    <Heart 
                      className={`h-3 w-3 sm:h-4 sm:w-4 ${
                        favorites.has(product.id) 
                          ? 'fill-red-500 text-red-500' 
                          : 'text-gray-600'
                      }`} 
                    />
                  </Button>

                  {/* Condition Badge */}
                  <Badge 
                    className="absolute top-1 left-1 sm:top-2 sm:left-2 text-xs"
                    variant={product.condition === 'new' ? 'default' : 'secondary'}
                  >
                    {product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}
                  </Badge>
                </div>

                <CardContent className="p-2 sm:p-3 lg:p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold text-sm sm:text-base lg:text-lg line-clamp-2 min-h-[2.5rem]">{product.title}</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 mb-1 sm:mb-2 hidden sm:block">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                    <Badge variant="outline" className="text-xs w-fit">
                      {product.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{product.profiles?.campus || product.campus}</span>
                    </div>
                  </div>

                  {/* Seller Info */}
                  <div 
                    className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3 text-xs cursor-pointer hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/seller/${product.seller_id}`);
                    }}
                  >
                    <span className="truncate underline text-primary font-medium">by {product.profiles?.full_name}</span>
                    {product.profiles?.is_verified && (
                      <>
                        <div className="bg-blue-500 rounded-full p-0.5 flex-shrink-0">
                          <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>

                      </>
                    )}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{product.profiles?.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>

                    <div className="flex flex-col gap-2">
                    <div>
                      <div className="text-base sm:text-lg lg:text-xl font-bold text-primary">
                        ₦{product.price.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {product.stock_quantity} available
                      </div>
                    </div>
                    
                    <Button
                      variant={cart.has(product.id) ? "outline" : "brand"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(product.id);
                      }}
                      disabled={cart.has(product.id) || product.stock_quantity === 0}
                      className="w-full text-xs sm:text-sm"
                    >
                      <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {cart.has(product.id) ? 'In Cart' : 'Add to Cart'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Marketplace;