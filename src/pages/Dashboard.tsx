import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PullToRefresh } from "@/components/common/PullToRefresh";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
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
  Wallet,
  Upload,
  X,
} from "lucide-react";
import WalletDashboard from "@/components/wallet/WalletDashboard";

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
  "Books & Textbooks",
  "Electronics",
  "Fashion & Accessories",
  "Food & Beverages",
  "Services",
  "Sports & Recreation",
  "Home & Living",
  "Other",
];

const Dashboard = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [analyticsFilter, setAnalyticsFilter] = useState("best_selling");
  const [selectedProductAnalytics, setSelectedProductAnalytics] = useState<{
    product: Product;
    analytics: Analytics;
  } | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [newImages, setNewImages] = useState<File[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const handleRefresh = useCallback(async () => {
    await fetchProducts();
    await fetchAnalytics();
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    loadUserProfile();
    fetchProducts();
    fetchAnalytics();

    // Set up comprehensive real-time subscriptions
    const setupRealTime = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const channel = supabase
          .channel(`dashboard-realtime-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "product_analytics",
            },
            () => {
              fetchAnalytics();
              setLastUpdated(new Date());
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "products",
            },
            (payload) => {
              const productData = payload.new as any;
              if (productData?.seller_id === user.id) {
                fetchProducts();
                setLastUpdated(new Date());
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "orders",
            },
            (payload) => {
              const orderData = payload.new as any;
              if (orderData?.seller_id === user.id) {
                fetchAnalytics(); // Refresh analytics for new orders
                setLastUpdated(new Date());
              }
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "wallets",
            },
            (payload) => {
              const walletData = payload.new as any;
              if (walletData?.user_id === user.id) {
                // Wallet updated, could affect dashboard stats
                fetchAnalytics();
                setLastUpdated(new Date());
              }
            }
          )
          .subscribe((status) => {
            setIsRealTimeConnected(status === "SUBSCRIBED");
          });

        return () => {
          supabase.removeChannel(channel);
        };
      }
    };

    const cleanup = setupRealTime();

    return () => {
      if (cleanup) {
        cleanup.then((fn) => fn && fn());
      }
    };
  }, []);

  const loadUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, account_type, seller_status")
        .eq("user_id", user.id)
        .single();

      if (error) {
        // Create profile with signup data if it doesn't exist
        if (error.code === "PGRST116") {
          await supabase.from("profiles").insert({
            user_id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || "User",
            account_type: user.user_metadata?.account_type || "buyer",
            university_name: user.user_metadata?.university_name,
            campus: user.user_metadata?.campus,
            student_id: user.user_metadata?.student_id,
            verification_status:
              user.user_metadata?.account_type === "seller" ? "pending" : null,
          });
        }
        return;
      }

      // Check if user is approved seller
      if (
        profile.account_type === "buyer" ||
        profile.seller_status !== "approved"
      ) {
        setAccessDenied(true);
        return;
      }

      setUserProfile(profile);
    } catch (error) {
      // Error handled silently
    }
  };

  const fetchProducts = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("product_analytics")
        .select(
          `
          *,
          products!inner(seller_id)
        `
        )
        .eq("products.seller_id", user.id);

      if (error) throw error;
      setAnalytics(data || []);
    } catch (error) {
      // Error handled silently
    }
  };

  const uploadNewImages = async () => {
    const uploadedUrls = [];
    
    for (let i = 0; i < newImages.length; i++) {
      const file = newImages[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${i}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(fileName, file);
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleUpdateProduct = async (product: Product) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Re-verify seller status before update (prevent race conditions)
      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("account_type, seller_status")
        .eq("user_id", user.id)
        .single();

      if (profileError || !currentProfile) {
        toast({
          title: "Error",
          description: "Unable to verify your account status",
          variant: "destructive",
        });
        return;
      }

      if (
        currentProfile.account_type === "buyer" ||
        currentProfile.seller_status !== "approved"
      ) {
        toast({
          title: "Access Denied",
          description: "You must be an approved seller to update products",
          variant: "destructive",
        });
        navigate("/profile");
        return;
      }

      // Upload new images if any
      let updatedImages = [...product.images];
      if (newImages.length > 0) {
        const newImageUrls = await uploadNewImages();
        updatedImages = [...updatedImages, ...newImageUrls];
      }

      const { error } = await supabase
        .from("products")
        .update({
          title: product.title,
          description: product.description,
          category: product.category,
          price: product.price,
          stock_quantity: product.stock_quantity,
          condition: product.condition,
          campus: product.campus,
          is_active: product.is_active,
          images: updatedImages,
        })
        .eq("id", product.id);

      if (error) {
        if (error.message.includes("approved sellers")) {
          toast({
            title: "Access Denied",
            description: "Only approved sellers can update products",
            variant: "destructive",
          });
          navigate("/profile");
          return;
        }
        throw error;
      }

      toast({
        title: "Product Updated",
        description: "Your product has been successfully updated.",
      });

      setEditingProduct(null);
      setNewImages([]);
      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product.",
        variant: "destructive",
      });
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const totalImages = (editingProduct?.images?.length || 0) + newImages.length;
      const remainingSlots = 3 - totalImages;
      const filesToAdd = files.slice(0, remainingSlots);
      setNewImages(prev => [...prev, ...filesToAdd]);
    }
    e.target.value = '';
  };

  const removeExistingImage = (index: number) => {
    if (editingProduct) {
      const updatedImages = editingProduct.images.filter((_, i) => i !== index);
      setEditingProduct({ ...editingProduct, images: updatedImages });
    }
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
  };

  const toggleProductStatus = async (productId: string, isActive: boolean) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Re-verify seller status before status toggle
      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("account_type, seller_status")
        .eq("user_id", user.id)
        .single();

      if (profileError || !currentProfile) {
        toast({
          title: "Error",
          description: "Unable to verify your account status",
          variant: "destructive",
        });
        return;
      }

      if (
        currentProfile.account_type === "buyer" ||
        currentProfile.seller_status !== "approved"
      ) {
        toast({
          title: "Access Denied",
          description: "You must be an approved seller to manage products",
          variant: "destructive",
        });
        navigate("/profile");
        return;
      }

      const { error } = await supabase
        .from("products")
        .update({ is_active: !isActive })
        .eq("id", productId);

      if (error) {
        if (error.message.includes("approved sellers")) {
          toast({
            title: "Access Denied",
            description: "Only approved sellers can manage products",
            variant: "destructive",
          });
          navigate("/profile");
          return;
        }
        throw error;
      }

      toast({
        title: "Status Updated",
        description: `Product ${
          !isActive ? "activated" : "deactivated"
        } successfully.`,
      });

      fetchProducts();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product status.",
        variant: "destructive",
      });
    }
  };

  const getProductAnalytics = (productId: string) => {
    return (
      analytics.find((a) => a.product_id === productId) || {
        product_id: productId,
        views: 0,
        favorites_count: 0,
        cart_additions: 0,
        orders_count: 0,
        revenue: 0,
      }
    );
  };

  const getFilteredAnalytics = () => {
    const sorted = [...analytics];
    switch (analyticsFilter) {
      case "view_all":
        return sorted;
      case "best_selling":
        return sorted.sort((a, b) => b.orders_count - a.orders_count);
      case "most_views":
        return sorted.sort((a, b) => b.views - a.views);
      case "most_cart_adds":
        return sorted.sort((a, b) => b.cart_additions - a.cart_additions);
      case "most_favorited":
        return sorted.sort((a, b) => b.favorites_count - a.favorites_count);
      case "highest_revenue":
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

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6 text-center">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 text-muted-foreground mb-4">
                  🚫
                </div>
                <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-4">
                  You need to be an approved seller to access the dashboard.
                </p>
                <Button onClick={() => navigate("/profile")} variant="outline">
                  Go to Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="container mx-auto px-4 py-4 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                    Seller Dashboard
                  </h1>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Manage your products and view analytics
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground sm:hidden">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isRealTimeConnected ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                  <span>{isRealTimeConnected ? "Live" : "Offline"}</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isRealTimeConnected ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <span>
                  {isRealTimeConnected ? "Live updates" : "Connecting..."}
                </span>
                <span>•</span>
                <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              </div>
            </div>
            <Button variant="brand" asChild className="w-full sm:w-auto">
              <a href="/sell">
                <Plus className="h-4 w-4" />
                Add Product
              </a>
            </Button>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-university-green" />
                  <span className="text-xs sm:text-sm font-medium">
                    Products
                  </span>
                </div>
                <div className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">
                  {products.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-university-green" />
                  <span className="text-xs sm:text-sm font-medium">
                    Revenue
                  </span>
                </div>
                <div className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">
                  ₦{totalRevenue.toLocaleString()}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-university-green" />
                  <span className="text-xs sm:text-sm font-medium">Orders</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">
                  {totalOrders}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-university-green" />
                  <span className="text-xs sm:text-sm font-medium">Views</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold mt-1 sm:mt-2">
                  {totalViews}
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="products" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 h-fit">
              <TabsTrigger value="products" className="text-xs sm:text-sm">
                Products
              </TabsTrigger>
              <TabsTrigger value="wallet" className="text-xs sm:text-sm">
                Wallet
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm">
                Analytics
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="space-y-3 sm:space-y-4">
              {products.length === 0 ? (
                <Card>
                  <CardContent className="p-6 sm:p-8 text-center">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-base sm:text-lg font-semibold mb-2">
                      No products yet
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground mb-4">
                      Start selling by adding your first product
                    </p>
                    <Button
                      variant="brand"
                      asChild
                      className="w-full sm:w-auto"
                    >
                      <a href="/sell">Add Your First Product</a>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((product) => {
                    const productAnalytics = getProductAnalytics(product.id);
                    return (
                      <Card key={product.id}>
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex gap-3 cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                              {product.images && product.images[0] && (
                                <img
                                  src={product.images[0]}
                                  alt={product.title}
                                  className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                                  <h3 className="text-sm sm:text-lg font-semibold truncate">
                                    {product.title}
                                  </h3>
                                  <Badge
                                    variant={
                                      product.is_active
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="text-xs"
                                  >
                                    {product.is_active ? "Active" : "Inactive"}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {product.condition}
                                  </Badge>
                                </div>
                                <p className="text-xs sm:text-sm text-muted-foreground mb-2 line-clamp-2">
                                  {product.description}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                                  <span className="font-medium">
                                    ₦{product.price.toLocaleString()}
                                  </span>
                                  <span>{product.stock_quantity} in stock</span>
                                  <span className="hidden sm:inline">
                                    {product.category}
                                  </span>
                                </div>

                                {/* Analytics Summary */}
                                <div className="flex items-center gap-3 sm:gap-4 text-xs">
                                  <div className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    <span>{productAnalytics.views}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Heart className="h-3 w-3" />
                                    <span>
                                      {productAnalytics.favorites_count}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <ShoppingCart className="h-3 w-3" />
                                    <span>
                                      {productAnalytics.cart_additions}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    <span>{productAnalytics.orders_count}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingProduct(product);
                                }}
                                className="flex-1 md:w-[fit] md:flex-none text-xs lg:text-sm px-2 lg:px-10"
                              >
                                <Edit3 className="h-3 w-3 lg:h-4 lg:w-4 mr-1 lg:mr-2" />
                                Edit
                              </Button>
                              <Button
                                variant={
                                  product.is_active ? "destructive" : "default"
                                }
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProductStatus(
                                    product.id,
                                    product.is_active
                                  );
                                }}
                                className="flex-1 md:w-[fit] md:flex-none text-xs lg:text-sm px-2 lg:px-10"
                              >
                                {product.is_active ? "Deactivate" : "Activate"}
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

            <TabsContent value="analytics" className="space-y-3 sm:space-y-4">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <CardTitle className="text-base sm:text-lg">
                      Product Analytics
                    </CardTitle>
                    <select
                      value={analyticsFilter}
                      onChange={(e) => setAnalyticsFilter(e.target.value)}
                      className="w-full sm:w-48 h-10 px-3 text-sm border border-input bg-background rounded-md"
                    >
                      <option value="view_all">View All Products</option>
                      <option value="best_selling">Best Selling</option>
                      <option value="most_views">Most Views</option>
                      <option value="most_cart_adds">Most Cart Adds</option>
                      <option value="most_favorited">Most Favorited</option>
                      <option value="highest_revenue">Highest Revenue</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {analytics.length === 0 ? (
                    <div className="text-center py-6 sm:py-8">
                      <BarChart3 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                      <p className="text-base sm:text-lg font-medium">
                        No analytics data
                      </p>
                      <p className="text-sm sm:text-base text-muted-foreground">
                        Analytics will appear once you have products with
                        activity
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {analyticsFilter === "view_all"
                        ? // Show all products when "View All Products" is selected
                          products.map((product, index) => {
                            const productAnalytics = getProductAnalytics(
                              product.id
                            );
                            return (
                              <div
                                key={product.id}
                                className="flex items-center justify-between p-3 sm:p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() =>
                                  setSelectedProductAnalytics({
                                    product,
                                    analytics: productAnalytics,
                                  })
                                }
                              >
                                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                  <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full text-xs sm:text-sm font-bold flex-shrink-0">
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm sm:text-base truncate">
                                      {product.title}
                                    </p>
                                    <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                                      <div className="flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        <span>{productAnalytics.views}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Heart className="h-3 w-3" />
                                        <span>
                                          {productAnalytics.favorites_count}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <ShoppingCart className="h-3 w-3" />
                                        <span>
                                          {productAnalytics.cart_additions}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-bold text-sm sm:text-lg">
                                    {productAnalytics.orders_count} orders
                                  </p>
                                  <p className="text-xs sm:text-sm text-muted-foreground">
                                    ₦{productAnalytics.revenue.toLocaleString()}
                                  </p>
                                  <p className="text-xs text-primary mt-1">
                                    Click to view full details
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        : // Show filtered analytics for other options
                          getFilteredAnalytics()
                            .slice(0, 10)
                            .map((productAnalytics, index) => {
                              const product = products.find(
                                (p) => p.id === productAnalytics.product_id
                              );
                              return (
                                <div
                                  key={productAnalytics.product_id}
                                  className="flex items-center justify-between p-3 sm:p-4 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                  onClick={() =>
                                    product &&
                                    setSelectedProductAnalytics({
                                      product,
                                      analytics: productAnalytics,
                                    })
                                  }
                                >
                                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                    <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-primary/10 rounded-full text-xs sm:text-sm font-bold flex-shrink-0">
                                      {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-sm sm:text-base truncate">
                                        {product?.title}
                                      </p>
                                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mt-1">
                                        <div className="flex items-center gap-1">
                                          <Eye className="h-3 w-3" />
                                          <span>{productAnalytics.views}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Heart className="h-3 w-3" />
                                          <span>
                                            {productAnalytics.favorites_count}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <ShoppingCart className="h-3 w-3" />
                                          <span>
                                            {productAnalytics.cart_additions}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-bold text-sm sm:text-lg">
                                      {productAnalytics.orders_count} orders
                                    </p>
                                    <p className="text-xs sm:text-sm text-muted-foreground">
                                      ₦
                                      {productAnalytics.revenue.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-primary mt-1">
                                      Click to view full details
                                    </p>
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
        </main>
      </PullToRefresh>

      {/* Detailed Analytics Modal */}
      {selectedProductAnalytics &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold truncate pr-4">
                  {selectedProductAnalytics.product.title} - Analytics
                </h2>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setSelectedProductAnalytics(null)}
                  className="text-2xl font-bold shrink-0"
                >
                  ×
                </Button>
              </div>
              <div className="p-4 space-y-4">
                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium">Views</span>
                    </div>
                    <div className="text-xl font-bold">
                      {selectedProductAnalytics.analytics.views}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-xs font-medium">Favorites</span>
                    </div>
                    <div className="text-xl font-bold">
                      {selectedProductAnalytics.analytics.favorites_count}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-4 w-4 text-green-500" />
                      <span className="text-xs font-medium">Cart Adds</span>
                    </div>
                    <div className="text-xl font-bold">
                      {selectedProductAnalytics.analytics.cart_additions}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-medium">Orders</span>
                    </div>
                    <div className="text-xl font-bold">
                      {selectedProductAnalytics.analytics.orders_count}
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Engagement Chart */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-4 text-sm">
                      Engagement Metrics
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Views</span>
                        <div className="flex items-center gap-2 flex-1 max-w-24 sm:max-w-32">
                          <div className="flex-1 h-2 bg-gray-200 rounded">
                            <div
                              className="h-full bg-blue-500 rounded"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (selectedProductAnalytics.analytics.views /
                                    Math.max(
                                      selectedProductAnalytics.analytics.views,
                                      selectedProductAnalytics.analytics
                                        .favorites_count,
                                      selectedProductAnalytics.analytics
                                        .cart_additions
                                    )) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {selectedProductAnalytics.analytics.views}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Favorites</span>
                        <div className="flex items-center gap-2 flex-1 max-w-24 sm:max-w-32">
                          <div className="flex-1 h-2 bg-gray-200 rounded">
                            <div
                              className="h-full bg-red-500 rounded"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (selectedProductAnalytics.analytics
                                    .favorites_count /
                                    Math.max(
                                      selectedProductAnalytics.analytics.views,
                                      selectedProductAnalytics.analytics
                                        .favorites_count,
                                      selectedProductAnalytics.analytics
                                        .cart_additions
                                    )) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {selectedProductAnalytics.analytics.favorites_count}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Cart Adds</span>
                        <div className="flex items-center gap-2 flex-1 max-w-24 sm:max-w-32">
                          <div className="flex-1 h-2 bg-gray-200 rounded">
                            <div
                              className="h-full bg-green-500 rounded"
                              style={{
                                width: `${Math.min(
                                  100,
                                  (selectedProductAnalytics.analytics
                                    .cart_additions /
                                    Math.max(
                                      selectedProductAnalytics.analytics.views,
                                      selectedProductAnalytics.analytics
                                        .favorites_count,
                                      selectedProductAnalytics.analytics
                                        .cart_additions
                                    )) *
                                    100
                                )}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {selectedProductAnalytics.analytics.cart_additions}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Chart */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-4 text-sm">
                      Revenue & Orders
                    </h3>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-green-600">
                          ₦
                          {selectedProductAnalytics.analytics.revenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-600">
                          Total Revenue
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-bold text-blue-600">
                          {selectedProductAnalytics.analytics.orders_count}
                        </div>
                        <div className="text-xs text-gray-600">
                          Total Orders
                        </div>
                      </div>
                      {selectedProductAnalytics.analytics.orders_count > 0 && (
                        <div className="text-center">
                          <div className="text-base sm:text-lg font-semibold">
                            ₦
                            {Math.round(
                              selectedProductAnalytics.analytics.revenue /
                                selectedProductAnalytics.analytics.orders_count
                            ).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-600">
                            Average Order Value
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-4 text-sm">
                    Product Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium">Price:</span>
                      <span className="ml-2">
                        ₦
                        {selectedProductAnalytics.product.price.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Category:</span>
                      <span className="ml-2">
                        {selectedProductAnalytics.product.category}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Condition:</span>
                      <span className="ml-2 capitalize">
                        {selectedProductAnalytics.product.condition}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Stock:</span>
                      <span className="ml-2">
                        {selectedProductAnalytics.product.stock_quantity}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge
                        variant={
                          selectedProductAnalytics.product.is_active
                            ? "default"
                            : "secondary"
                        }
                        className="ml-2"
                      >
                        {selectedProductAnalytics.product.is_active
                          ? "Active"
                          : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>
                      <span className="ml-2">
                        {new Date(
                          selectedProductAnalytics.product.created_at
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Product Modal */}
      {editingProduct &&
        createPortal(
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white border-b p-4">
                <h2 className="text-lg font-semibold">Edit Product</h2>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label htmlFor="edit-title" className="text-sm font-medium">
                    Title
                  </Label>
                  <Input
                    id="edit-title"
                    value={editingProduct.title}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        title: e.target.value,
                      })
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="edit-description"
                    className="text-sm font-medium"
                  >
                    Description
                  </Label>
                  <Textarea
                    id="edit-description"
                    value={editingProduct.description || ""}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label
                      htmlFor="edit-category"
                      className="text-sm font-medium"
                    >
                      Category
                    </Label>
                    <Select
                      value={editingProduct.category}
                      onValueChange={(value) =>
                        setEditingProduct({
                          ...editingProduct,
                          category: value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label
                      htmlFor="edit-condition"
                      className="text-sm font-medium"
                    >
                      Condition
                    </Label>
                    <Select
                      value={editingProduct.condition}
                      onValueChange={(value) =>
                        setEditingProduct({
                          ...editingProduct,
                          condition: value,
                        })
                      }
                    >
                      <SelectTrigger className="mt-1">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-price" className="text-sm font-medium">
                      Price (₦)
                    </Label>
                    <Input
                      id="edit-price"
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-stock" className="text-sm font-medium">
                      Stock Quantity
                    </Label>
                    <Input
                      id="edit-stock"
                      type="number"
                      value={editingProduct.stock_quantity}
                      onChange={(e) =>
                        setEditingProduct({
                          ...editingProduct,
                          stock_quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Image Management */}
                <div>
                  <Label className="text-sm font-medium">Product Images</Label>
                  
                  {/* Existing Images */}
                  {editingProduct.images && editingProduct.images.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-2">Current Images:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {editingProduct.images.map((imageUrl, index) => (
                          <div key={index} className="relative">
                            <img
                              src={imageUrl}
                              alt={`Product ${index + 1}`}
                              className="w-full h-20 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeExistingImage(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* New Images */}
                  {newImages.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground mb-2">New Images:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {newImages.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`New ${index + 1}`}
                              className="w-full h-20 object-cover rounded"
                            />
                            <button
                              type="button"
                              onClick={() => removeNewImage(index)}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Upload New Images */}
                  {((editingProduct.images?.length || 0) + newImages.length) < 3 && (
                    <div className="mt-2">
                      <input
                        type="file"
                        id="edit-images"
                        multiple
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="edit-images"
                        className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">
                          Add Images ({(editingProduct.images?.length || 0) + newImages.length}/3)
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditingProduct(null);
                      setNewImages([]);
                    }}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="brand"
                    onClick={() => handleUpdateProduct(editingProduct)}
                    className="w-full sm:w-auto"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default Dashboard;
