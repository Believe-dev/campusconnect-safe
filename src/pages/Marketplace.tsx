import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Heart,
  ShoppingCart,
  Search,
  Filter,
  Star,
  MapPin,
  Package,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { OfflineNotice } from "@/components/ui/offline-notice";
import { User } from "@supabase/supabase-js";
import { searchProducts } from "@/utils/searchUtils";
import "@/styles/animations.css";

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
    business_name?: string;
    rating: number;
    is_verified: boolean;
  };
}

const categories = [
  "All Categories",
  "Books & Textbooks",
  "Electronics",
  "Fashion & Accessories",
  "Food & Beverages",
  "Services",
  "Sports & Recreation",
  "Home & Living",
  "Other",
];

const conditions = ["All Conditions", "new", "excellent", "good", "fair"];

const Marketplace = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [userUniversity, setUserUniversity] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedCondition, setSelectedCondition] = useState("All Conditions");
  const [sortBy, setSortBy] = useState("newest");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();
  const handleRefresh = useCallback(async () => {
    await fetchProducts();
    if (user) {
      await fetchUserData(user.id);
    }
  }, [user]);

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
        .from("products")
        .select(
          `
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
            business_name,
            rating,
            is_verified,
            campus
          )
        `
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
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
        .from("favorites")
        .select("product_id")
        .eq("user_id", userId);

      if (favoritesData) {
        setFavorites(new Set(favoritesData.map((f) => f.product_id)));
      }

      // Fetch cart
      const { data: cartData } = await supabase
        .from("cart")
        .select("product_id")
        .eq("user_id", userId);

      if (cartData) {
        setCart(new Set(cartData.map((c) => c.product_id)));
      }
    } catch (error) {
      // Error handled silently
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
    if (selectedCategory !== "All Categories") {
      filtered = filtered.filter(
        (product) => product.category === selectedCategory
      );
    }

    // Condition filter
    if (selectedCondition !== "All Conditions") {
      filtered = filtered.filter(
        (product) => product.condition === selectedCondition
      );
    }

    // Show all products without university prioritization
    // Removed university-specific filtering to show all products

    // Sort with verified sellers first
    switch (sortBy) {
      case "price_low":
        filtered.sort((a, b) => {
          const aVerified = a.profiles?.is_verified;
          const bVerified = b.profiles?.is_verified;

          if (aVerified && !bVerified) return -1;
          if (!aVerified && bVerified) return 1;
          return a.price - b.price;
        });
        break;
      case "price_high":
        filtered.sort((a, b) => {
          const aVerified = a.profiles?.is_verified;
          const bVerified = b.profiles?.is_verified;

          if (aVerified && !bVerified) return -1;
          if (!aVerified && bVerified) return 1;
          return b.price - a.price;
        });
        break;
      case "newest":
        filtered.sort((a, b) => {
          const aVerified = a.profiles?.is_verified;
          const bVerified = b.profiles?.is_verified;

          if (aVerified && !bVerified) return -1;
          if (!aVerified && bVerified) return 1;
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        });
        break;
      case "oldest":
        filtered.sort((a, b) => {
          const aVerified = a.profiles?.is_verified;
          const bVerified = b.profiles?.is_verified;

          if (aVerified && !bVerified) return -1;
          if (!aVerified && bVerified) return 1;
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
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
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);

        setFavorites((prev) => {
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
          .from("favorites")
          .insert({ user_id: user.id, product_id: productId });

        setFavorites((prev) => new Set([...prev, productId]));

        toast({
          title: "Added to favorites",
          description: "Product added to your favorites",
        });
      }

      // Update analytics
      await updateAnalytics(productId, "favorites_count", isFavorited ? -1 : 1);
    } catch (error) {
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
        .from("cart")
        .insert({ user_id: user.id, product_id: productId, quantity: 1 });

      setCart((prev) => new Set([...prev, productId]));

      toast({
        title: "Added to cart",
        description: "Product added to your cart",
      });

      // Update analytics
      await updateAnalytics(productId, "cart_additions", 1);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add to cart",
        variant: "destructive",
      });
    }
  };

  const updateAnalytics = async (
    productId: string,
    field: string,
    increment: number
  ) => {
    try {
      // First try to get existing analytics
      const { data: existing } = await supabase
        .from("product_analytics")
        .select(field)
        .eq("product_id", productId)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from("product_analytics")
          .update({
            [field]: Math.max(0, existing[field] + increment),
            last_updated: new Date().toISOString(),
          })
          .eq("product_id", productId);
      } else {
        // Create new analytics entry
        await supabase.from("product_analytics").insert({
          product_id: productId,
          [field]: Math.max(0, increment),
        });
      }
    } catch (error) {
      // Error handled silently
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <OfflineNotice />

        {/* Enhanced Search & Filters */}
        <Card className="mb-8 border-0 shadow-lg animate-fade-in-up">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Search Bar */}
              <div className="max-w-2xl mx-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                  }}
                  className="relative"
                >
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search for anything..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-24 h-14 text-lg border-2 border-gray-200 focus:border-university-green rounded-xl"
                    />
                    <Button
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-university-green hover:bg-university-green/90 rounded-lg px-6"
                    >
                      Search
                    </Button>
                  </div>
                </form>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-3 justify-center">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-4xl">
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="h-12 border-2 border-gray-200 rounded-lg">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedCondition}
                    onValueChange={setSelectedCondition}
                  >
                    <SelectTrigger className="h-12 border-2 border-gray-200 rounded-lg">
                      <SelectValue placeholder="Condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map((condition) => (
                        <SelectItem key={condition} value={condition}>
                          {condition === "All Conditions"
                            ? condition
                            : condition.charAt(0).toUpperCase() +
                              condition.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-12 border-2 border-gray-200 rounded-lg">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="price_low">
                        Price: Low to High
                      </SelectItem>
                      <SelectItem value="price_high">
                        Price: High to Low
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    className="h-12 border-2 border-gray-200 rounded-lg hover:bg-gray-50"
                    onClick={() => {
                      setSelectedCategory("All Categories");
                      setSelectedCondition("All Conditions");
                      setSortBy("newest");
                      setSearchQuery("");
                    }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {filteredProducts.length} Products Found
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              🏆 Verified sellers shown first • 🔒 All transactions protected
            </p>
            <div className="text-sm text-gray-600 mt-1 flex gap-1 items-center">
              Products with{" "}
              <span className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                <svg
                  className="h-3 w-3 sm:h-4 sm:w-4 text-white"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>{" "}
              are verified sellers{" "}
            </div>
          </div>
          <Badge
            variant="outline"
            className="hidden sm:flex items-center gap-1"
          >
            <Shield className="h-3 w-3" />
            Secure Marketplace
          </Badge>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 sm:py-16 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <Package className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                  No products found
                </h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  We couldn't find any products matching your criteria. Try
                  adjusting your filters or search terms.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => {
                      setSelectedCategory("All Categories");
                      setSelectedCondition("All Conditions");
                      setSortBy("newest");
                      setSearchQuery("");
                    }}
                    className="bg-university-green hover:bg-university-green/90"
                  >
                    Clear All Filters
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/search")}>
                    Try Advanced Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {filteredProducts.map((product, index) => (
              <Card
                key={product.id}
                className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden border-0 shadow-sm bg-white"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="relative">
                  {product.images && product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="w-full h-32 sm:h-40 md:h-44 lg:h-48 object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/placeholder.svg";
                      }}
                    />
                  ) : (
                    <div className="w-full h-32 sm:h-40 md:h-44 lg:h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <Package className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400" />
                    </div>
                  )}

                  {/* Favorite Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(product.id);
                    }}
                  >
                    <Heart
                      className={`h-3 w-3 sm:h-4 sm:w-4 transition-colors ${
                        favorites.has(product.id)
                          ? "fill-red-500 text-red-500"
                          : "text-gray-600 hover:text-red-500"
                      }`}
                    />
                  </Button>

                  {/* Condition Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge
                      className={`text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 font-medium ${
                        product.condition === "new"
                          ? "bg-green-500 text-white border-0"
                          : "bg-blue-500 text-white border-0"
                      }`}
                    >
                      {product.condition.charAt(0).toUpperCase() +
                        product.condition.slice(1)}
                    </Badge>
                  </div>

                  {/* Verified Seller Badge */}
                  {product.profiles?.is_verified && (
                    <div className="absolute bottom-2 left-2">
                      <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                        <svg
                          className="h-3 w-3 sm:h-4 sm:w-4 text-white"
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

                <CardContent className="p-2 sm:p-3 lg:p-4">
                  <div className="space-y-2 sm:space-y-3">
                    {/* Title */}
                    <h3 className="font-semibold text-sm sm:text-base lg:text-lg line-clamp-2 text-gray-900 leading-tight">
                      {product.title}
                    </h3>

                    {/* Category & Location */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs bg-gray-50 border-gray-200 w-fit"
                      >
                        {product.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          {(product.profiles as any)?.campus || product.campus}
                        </span>
                      </div>
                    </div>

                    {/* Seller Info */}
                    <div
                      className="flex items-center justify-between p-1.5 sm:p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/seller/${product.seller_id}`);
                      }}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-university-green/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-university-green">
                            {product.profiles?.full_name?.charAt(0) || "U"}
                          </span>
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-university-green hover:underline truncate">
                          {product.profiles?.business_name ||
                            product.profiles?.full_name ||
                            "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs text-gray-600">
                          {product.profiles?.rating?.toFixed(1) || "0.0"}
                        </span>
                      </div>
                    </div>

                    {/* Price & Stock */}
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">
                          ₦{product.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.stock_quantity} left
                        </div>
                      </div>

                      {/* Add to Cart Button */}
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(product.id);
                        }}
                        disabled={product.stock_quantity === 0}
                        className={`text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 ${
                          cart.has(product.id)
                            ? "bg-green-500 hover:bg-green-600 text-white"
                            : "bg-university-green hover:bg-university-green/90 text-white"
                        }`}
                      >
                        <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">
                          {cart.has(product.id) ? "Added" : "Add"}
                        </span>
                        <span className="sm:hidden">
                          {cart.has(product.id) ? "✓" : "+"}
                        </span>
                      </Button>
                    </div>
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
