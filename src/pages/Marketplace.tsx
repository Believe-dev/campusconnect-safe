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
import { User } from '@supabase/supabase-js';

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
      }
    });

    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory, selectedCondition, sortBy]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles!products_seller_id_fkey (
            full_name,
            rating,
            is_verified
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
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
      console.error('Error fetching user data:', error);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Condition filter
    if (selectedCondition !== 'All Conditions') {
      filtered = filtered.filter(product => product.condition === selectedCondition);
    }

    // Sort
    switch (sortBy) {
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
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
      console.error('Error toggling favorite:', error);
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
      console.error('Error adding to cart:', error);
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
      console.error('Error updating analytics:', error);
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
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Marketplace</h1>
          <p className="text-muted-foreground">Discover products from fellow students</p>
        </div>

            {/* Filters */}
            <Card className="mb-6 lg:mb-8">
              <CardContent className="p-4 lg:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                <SelectTrigger>
                  <SelectValue placeholder="Condition" />
                </SelectTrigger>
                <SelectContent>
                  {conditions.map(condition => (
                    <SelectItem key={condition} value={condition}>
                      {condition === 'All Conditions' ? condition : condition.charAt(0).toUpperCase() + condition.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="mb-4 lg:mb-6">
          <p className="text-sm lg:text-base text-muted-foreground">
            Showing <span className="font-medium">{filteredProducts.length}</span> products
          </p>
        </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <Card>
              <CardContent className="p-8 lg:p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </CardContent>
          </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="group hover:shadow-lg transition-smooth cursor-pointer"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="relative">
                  {product.images && product.images[0] && (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-48 object-cover rounded-t-lg group-hover:scale-105 transition-smooth"
                    />
                  )}
                  
                  {/* Favorite Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product.id);
                    }}
                  >
                    <Heart 
                      className={`h-4 w-4 ${
                        favorites.has(product.id) 
                          ? 'fill-red-500 text-red-500' 
                          : 'text-gray-600'
                      }`} 
                    />
                  </Button>

                  {/* Condition Badge */}
                  <Badge 
                    className="absolute top-2 left-2"
                    variant={product.condition === 'new' ? 'default' : 'secondary'}
                  >
                    {product.condition.charAt(0).toUpperCase() + product.condition.slice(1)}
                  </Badge>
                </div>

                <CardContent className="p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{product.title}</h3>
                    <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                      {product.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span>{product.campus}</span>
                    </div>
                  </div>

                  {/* Seller Info */}
                  <div 
                    className="flex items-center gap-2 mb-3 text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/seller/${product.seller_id}`);
                    }}
                  >
                    <span>by {product.profiles?.full_name}</span>
                    {product.profiles?.is_verified && (
                      <Shield className="h-3 w-3 text-verified-blue" />
                    )}
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{product.profiles?.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-lg sm:text-xl font-bold text-primary">
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
                      className="w-full sm:w-auto"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
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