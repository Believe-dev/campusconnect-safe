import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/enhanced-button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search as SearchIcon, Filter, SlidersHorizontal, ShoppingCart, MessageCircle, MapPin, Star } from 'lucide-react';
import Header from '@/components/layout/Header';

import { expandSearchTerms } from '@/utils/searchUtils';

interface SearchProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  campus: string;
  condition: string;
  images: string[];
  seller_id: string;
  stock_quantity: number;
  created_at: string;
  seller: {
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

const campuses = [
  'All Campuses',
  'University of Lagos',
  'University of Ibadan',
  'Ahmadu Bello University',
  'University of Nigeria, Nsukka',
  'Obafemi Awolowo University',
  'University of Benin',
  'Other'
];

const Search = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedCampus, setSelectedCampus] = useState('All Campuses');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    } catch (error) {
      // Error handled silently
    }
  };

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
    }
    searchProducts();
  }, [searchParams]);

  const searchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          profiles!products_seller_id_fkey (
            full_name,
            avatar_url,
            is_verified,
            rating
          )
        `)
        .eq('is_active', true);
      
      const searchTerm = searchParams.get('q') || searchQuery;

      // Apply enhanced search query with synonyms
      if (searchTerm && searchTerm.trim()) {
        const expandedTerms = expandSearchTerms(searchTerm.trim());
        const conditions = [];
        expandedTerms.forEach(term => {
          const escapedTerm = term.replace(/[%_]/g, '\\$&');
          conditions.push(`title.ilike.%${escapedTerm}%`);
          conditions.push(`description.ilike.%${escapedTerm}%`);
          conditions.push(`category.ilike.%${escapedTerm}%`);
        });
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }
      }

      // Apply category filter
      if (selectedCategory !== 'All Categories') {
        query = query.eq('category', selectedCategory);
      }

      // Apply campus filter
      if (selectedCampus !== 'All Campuses') {
        query = query.eq('campus', selectedCampus);
      }

      // Apply price range filter
      if (priceRange.min) {
        query = query.gte('price', parseFloat(priceRange.min));
      }
      if (priceRange.max) {
        query = query.lte('price', parseFloat(priceRange.max));
      }

      // Apply sorting
      switch (sortBy) {
        case 'price-low':
          query = query.order('price', { ascending: true });
          break;
        case 'price-high':
          query = query.order('price', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        default:
          query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform the data to match our Product interface
      const transformedData = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        price: item.price,
        category: item.category,
        campus: item.campus || 'Unknown Campus',
        condition: item.condition,
        images: item.images || [],
        seller_id: item.seller_id,
        stock_quantity: item.stock_quantity,
        created_at: item.created_at,
        seller: item.profiles ? {
          full_name: item.profiles.full_name,
          rating: item.profiles.rating,
          is_verified: item.profiles.is_verified
        } : {
          full_name: 'Unknown Seller',
          rating: 0,
          is_verified: false
        }
      }));
      
      setProducts(transformedData);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSelectedCategory('All Categories');
    setSelectedCampus('All Campuses');
    setPriceRange({ min: '', max: '' });
    setSortBy('newest');
    searchProducts();
  };

  const handleViewProduct = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const handleMessageSeller = (sellerId: string) => {
    navigate(`/messages?seller=${sellerId}`);
  };

  const addToCart = async (productId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (existingItem) {
        // Update quantity if item exists
        const { error } = await supabase
          .from('cart')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Add new item to cart
        const { error } = await supabase
          .from('cart')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1
          });

        if (error) throw error;
      }

      // Trigger cart count refresh
      if (window.refreshCartCount) {
        window.refreshCartCount();
      }
    } catch (error) {
      // Error handled silently
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Search Header */}
          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex gap-2 mb-4">
              <div className="flex-1 relative">
                <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products, categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearch(e);
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="brand">
                Search
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </form>

            {searchParams.get('q') && (
              <p className="text-muted-foreground">
                Search results for "<span className="font-medium">{searchParams.get('q')}</span>"
                {!loading && (
                  <span> • {products.length} product{products.length !== 1 ? 's' : ''} found</span>
                )}
              </p>
            )}
            <div className="mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
              📌 Verified sellers' products are shown first in search results
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
              <Card className="sticky top-4">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Filters</h3>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear All
                    </Button>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Campus</label>
                    <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {campuses.map(campus => (
                          <SelectItem key={campus} value={campus}>
                            {campus}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Price Range (₦)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={priceRange.min}
                        onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={priceRange.max}
                        onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Sort By</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest First</SelectItem>
                        <SelectItem value="oldest">Oldest First</SelectItem>
                        <SelectItem value="price-low">Price: Low to High</SelectItem>
                        <SelectItem value="price-high">Price: High to Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={searchProducts} className="w-full">
                    Apply Filters
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Results Grid */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-muted aspect-square rounded-lg mb-2"></div>
                      <div className="h-4 bg-muted rounded mb-2"></div>
                      <div className="h-4 bg-muted rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : products.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No products found</h3>
                    <p className="text-muted-foreground mb-4">
                      Try adjusting your search terms or filters
                    </p>
                    <Button onClick={clearFilters}>Clear Filters</Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((product) => (
                    <Card 
                      key={product.id} 
                      className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                      onClick={() => handleViewProduct(product.id)}
                    >
                      <div className="relative">
                        {product.images && product.images[0] && (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}
                        <Badge 
                          className="absolute top-2 left-2 text-xs"
                          variant={product.condition === 'new' ? 'default' : 'secondary'}
                        >
                          {product.condition?.charAt(0).toUpperCase() + product.condition?.slice(1) || 'Good'}
                        </Badge>
                      </div>

                      <CardContent className="p-3">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2">{product.title}</h3>
                        
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {product.category}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                          <span className="truncate">by {product.seller?.full_name || 'Unknown'}</span>
                          {product.seller?.is_verified && (
                            <div className="bg-blue-500 rounded-full p-0.5">
                              <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>

                        <div className="text-lg font-bold text-primary mb-2">
                          ₦{product.price.toLocaleString()}
                        </div>
                        
                        <Button
                          variant="brand"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(product.id);
                          }}
                          className="w-full text-xs"
                        >
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Add to Cart
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Search;