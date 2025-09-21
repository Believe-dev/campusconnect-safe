import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Edit3, 
  Eye, 
  Heart, 
  ShoppingCart, 
  TrendingUp, 
  Package, 
  DollarSign,
  BarChart3,
  Plus,
  Wallet
} from 'lucide-react';
import Header from '@/components/layout/Header';
import WalletDashboard from '@/components/wallet/WalletDashboard';

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
  is_active: boolean;
  created_at: string;
}

interface Analytics {
  product_id: string;
  views: number;
  favorites_count: number;
  cart_additions: number;
  orders_count: number;
  revenue: number;
}

const categories = [
  'Books & Textbooks',
  'Electronics',
  'Fashion & Accessories',
  'Food & Beverages',
  'Services',
  'Sports & Recreation',
  'Home & Living',
  'Other'
];

const Dashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [analyticsFilter, setAnalyticsFilter] = useState('best_selling');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadUserProfile();
    fetchProducts();
    fetchAnalytics();
    
    // Set up real-time subscription for analytics
    const setupRealTime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const channel = supabase
          .channel('analytics-changes')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'product_analytics'
            },
            (payload) => {
              // Refetch analytics when changes occur
              fetchAnalytics();
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    const cleanup = setupRealTime();
    
    return () => {
      if (cleanup) {
        cleanup.then(fn => fn && fn());
      }
    };
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
        // Create profile with signup data if it doesn't exist
        if (error.code === 'PGRST116') {
          await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || 'User',
              account_type: user.user_metadata?.account_type || 'buyer',
              university_name: user.user_metadata?.university_name,
              campus: user.user_metadata?.campus,
              student_id: user.user_metadata?.student_id,
              verification_status: user.user_metadata?.account_type === 'seller' ? 'pending' : null
            });
        }
        return;
      }
      setUserProfile(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('product_analytics')
        .select(`
          *,
          products!inner(seller_id)
        `)
        .eq('products.seller_id', user.id);

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const handleUpdateProduct = async (product: Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          title: product.title,
          description: product.description,
          category: product.category,
          price: product.price,
          stock_quantity: product.stock_quantity,
          condition: product.condition,
          campus: product.campus,
          is_active: product.is_active
        })
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Product Updated",
        description: "Your product has been successfully updated.",
      });

      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product.",
        variant: "destructive",
      });
    }
  };

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: !isActive })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Product ${!isActive ? 'activated' : 'deactivated'} successfully.`,
      });

      fetchProducts();
    } catch (error) {
      console.error('Error updating product status:', error);
      toast({
        title: "Error",
        description: "Failed to update product status.",
        variant: "destructive",
      });
    }
  };

  const getProductAnalytics = (productId: string) => {
    return analytics.find(a => a.product_id === productId) || {
      views: 0,
      favorites_count: 0,
      cart_additions: 0,
      orders_count: 0,
      revenue: 0
    };
  };

  const getFilteredAnalytics = () => {
    const sorted = [...analytics];
    switch (analyticsFilter) {
      case 'view_all':
        return sorted;
      case 'best_selling':
        return sorted.sort((a, b) => b.orders_count - a.orders_count);
      case 'most_views':
        return sorted.sort((a, b) => b.views - a.views);
      case 'most_cart_adds':
        return sorted.sort((a, b) => b.cart_additions - a.cart_additions);
      case 'most_favorited':
        return sorted.sort((a, b) => b.favorites_count - a.favorites_count);
      case 'highest_revenue':
        return sorted.sort((a, b) => b.revenue - a.revenue);
      default:
        return sorted;
    }
  };

  const totalRevenue = analytics.reduce((sum, a) => sum + Number(a.revenue), 0);
  const totalOrders = analytics.reduce((sum, a) => sum + a.orders_count, 0);
  const totalViews = analytics.reduce((sum, a) => sum + a.views, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
              <div className="h-32 bg-muted rounded"></div>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Seller Dashboard</h1>
            <p className="text-muted-foreground">Manage your products and view analytics</p>
          </div>
          <Button variant="brand" asChild>
            <a href="/sell">
              <Plus className="h-4 w-4" />
              Add Product
            </a>
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-university-green" />
                <span className="text-sm font-medium">Total Products</span>
              </div>
              <div className="text-2xl font-bold mt-2">{products.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-university-green" />
                <span className="text-sm font-medium">Total Revenue</span>
              </div>
              <div className="text-2xl font-bold mt-2">₦{totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-university-green" />
                <span className="text-sm font-medium">Total Orders</span>
              </div>
              <div className="text-2xl font-bold mt-2">{totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-university-green" />
                <span className="text-sm font-medium">Total Views</span>
              </div>
              <div className="text-2xl font-bold mt-2">{totalViews}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList>
            <TabsTrigger value="products">My Products</TabsTrigger>
            <TabsTrigger value="wallet">Wallet</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            {products.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                  <p className="text-muted-foreground mb-4">Start selling by adding your first product</p>
                  <Button variant="brand" asChild>
                    <a href="/sell">Add Your First Product</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {products.map((product) => {
                  const productAnalytics = getProductAnalytics(product.id);
                  return (
                    <Card key={product.id}>
                      <CardContent className="p-4 lg:p-6">
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                          <div className="flex flex-col sm:flex-row gap-4 flex-1">
                            {product.images && product.images[0] && (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="w-full sm:w-20 h-48 sm:h-20 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold truncate">{product.title}</h3>
                                <Badge variant={product.is_active ? "default" : "secondary"}>
                                  {product.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Badge variant="outline">{product.condition}</Badge>
                              </div>
                              <p className="text-muted-foreground mb-2 line-clamp-2">{product.description}</p>
                              <div className="flex flex-wrap items-center gap-2 lg:gap-4 text-sm text-muted-foreground mb-3">
                                <span>₦{product.price.toLocaleString()}</span>
                                <span>{product.stock_quantity} in stock</span>
                                <span className="hidden sm:inline">{product.category}</span>
                              </div>
                              
                              {/* Analytics Summary */}
                              <div className="grid grid-cols-2 lg:flex lg:items-center gap-2 lg:gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  <span className="text-xs lg:text-sm">{productAnalytics.views}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="h-3 w-3" />
                                  <span className="text-xs lg:text-sm">{productAnalytics.favorites_count}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ShoppingCart className="h-3 w-3" />
                                  <span className="text-xs lg:text-sm">{productAnalytics.cart_additions}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  <span className="text-xs lg:text-sm">{productAnalytics.orders_count}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-row lg:flex-col gap-2 lg:shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingProduct(product)}
                              className="flex-1 lg:flex-none"
                            >
                              <Edit3 className="h-4 w-4 lg:mr-2" />
                              <span className="hidden lg:inline">Edit</span>
                            </Button>
                            <Button
                              variant={product.is_active ? "destructive" : "default"}
                              size="sm"
                              onClick={() => toggleProductStatus(product.id, product.is_active)}
                              className="flex-1 lg:flex-none"
                            >
                              <span className="text-xs lg:text-sm">
                                {product.is_active ? 'Deactivate' : 'Activate'}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="wallet">
            <WalletDashboard />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Product Analytics</CardTitle>
                  <Select value={analyticsFilter} onValueChange={setAnalyticsFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view_all">View All Products</SelectItem>
                      <SelectItem value="best_selling">Best Selling</SelectItem>
                      <SelectItem value="most_views">Most Views</SelectItem>
                      <SelectItem value="most_cart_adds">Most Cart Adds</SelectItem>
                      <SelectItem value="most_favorited">Most Favorited</SelectItem>
                      <SelectItem value="highest_revenue">Highest Revenue</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {analytics.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium">No analytics data</p>
                    <p className="text-muted-foreground">Analytics will appear once you have products with activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredAnalytics().slice(0, analyticsFilter === 'view_all' ? analytics.length : 10).map((productAnalytics, index) => {
                      const product = products.find(p => p.id === productAnalytics.product_id);
                      return (
                        <div key={productAnalytics.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{product?.title}</p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  <span>{productAnalytics.views}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Heart className="h-3 w-3" />
                                  <span>{productAnalytics.favorites_count}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ShoppingCart className="h-3 w-3" />
                                  <span>{productAnalytics.cart_additions}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">{productAnalytics.orders_count} orders</p>
                            <p className="text-sm text-muted-foreground">₦{productAnalytics.revenue.toLocaleString()} revenue</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle>Edit Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={editingProduct.title}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      title: e.target.value
                    })}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingProduct.description || ''}
                    onChange={(e) => setEditingProduct({
                      ...editingProduct,
                      description: e.target.value
                    })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-category">Category</Label>
                    <Select
                      value={editingProduct.category}
                      onValueChange={(value) => setEditingProduct({
                        ...editingProduct,
                        category: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-condition">Condition</Label>
                    <Select
                      value={editingProduct.condition}
                      onValueChange={(value) => setEditingProduct({
                        ...editingProduct,
                        condition: value
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-price">Price (₦)</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        price: parseFloat(e.target.value) || 0
                      })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-stock">Stock Quantity</Label>
                    <Input
                      id="edit-stock"
                      type="number"
                      value={editingProduct.stock_quantity}
                      onChange={(e) => setEditingProduct({
                        ...editingProduct,
                        stock_quantity: parseInt(e.target.value) || 0
                      })}
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setEditingProduct(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="brand"
                    onClick={() => handleUpdateProduct(editingProduct)}
                  >
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;