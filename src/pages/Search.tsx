import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/enhanced-button";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search as SearchIcon,
  SlidersHorizontal,
  ShoppingCart,
  GraduationCap,
  Globe,
} from "lucide-react";

import { expandSearchTerms } from "@/utils/searchUtils";
import { performAISearch, expandAISearchTerms } from "@/utils/aiSearch";
import { NIGERIAN_UNIVERSITIES } from "@/lib/constants";
import { useProfile } from "@/contexts/ProfileContext";
import { useCartCount } from "@/contexts/CartCountContext";

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

interface SearchLiveFeed {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  location: string;
  expires_at: string;
  created_at: string;
  seller_id: string;
  seller: {
    full_name: string;
    rating: number;
    is_verified: boolean;
  };
  type: "live_feed";
}

type SearchResult = SearchProduct | SearchLiveFeed;

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

const universities = ["All Universities", ...NIGERIAN_UNIVERSITIES];

const Search = () => {
  const navigate = useNavigate();
  const { refetch: refetchCartCount } = useCartCount();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedUniversity, setSelectedUniversity] =
    useState("All Universities");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [user, setUser] = useState(null);
  const { profile } = useProfile();
  const userUniversity = profile?.university_name || null;
  const [cartItems, setCartItems] = useState<string[]>([]);
  const [showOtherSchools, setShowOtherSchools] = useState(false);
  const [universityProducts, setUniversityProducts] = useState<SearchResult[]>([]);
  const [otherSchoolProducts, setOtherSchoolProducts] = useState<SearchResult[]>([]);
  const [tryTheseOutProducts, setTryTheseOutProducts] = useState<SearchResult[]>([]);
  // Popup: ask user on first search whether to scope to their uni or all
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [pendingQuery, setPendingQuery] = useState("");
  // Sentinel ref for end-of-results banner
  const endOfResultsRef = useRef<HTMLDivElement>(null);
  const [showEndBanner, setShowEndBanner] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        loadCartItems(user.id);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const loadCartItems = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("cart")
        .select("product_id")
        .eq("user_id", userId);

      if (data) {
        setCartItems(data.map((item) => item.product_id));
      }
    } catch (error) {
      // Error handled silently
    }
  };

  useEffect(() => {
    const query = searchParams.get("q");
    if (query) setSearchQuery(query);
    searchProducts();
  }, [searchParams, showOtherSchools]);

  // IntersectionObserver — show end-of-results banner when user reaches bottom
  useEffect(() => {
    if (!endOfResultsRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && products.length > 0 && !showOtherSchools) setShowEndBanner(true); },
      { threshold: 0.5 }
    );
    observer.observe(endOfResultsRef.current);
    return () => observer.disconnect();
  }, [products, showOtherSchools]);

  const handleRefresh = useCallback(async () => {
    await searchProducts();
  }, []);

  const searchProducts = async () => {
    setLoading(true);
    try {
      const searchTerm = searchParams.get("q") || searchQuery;
      let searchResults = [];
      let otherProducts = [];
      let liveFeedResults = [];
      let otherLiveFeeds = [];
      let universityResults = [];
      let otherSchoolResults = [];

      if (searchTerm && searchTerm.trim()) {
        // Search products
        let productQuery = supabase
          .from("products")
          .select(
            `
            *,
            profiles!products_seller_id_fkey (
              full_name,
              avatar_url,
              is_verified,
              rating
            )
          `
          )
          .eq("is_active", true);

        // Search live feed items
        let liveFeedQuery = supabase
          .from("live_feed")
          .select(
            `
            *,
            profiles!live_feed_seller_id_fkey (
              full_name,
              avatar_url,
              is_verified,
              rating
            )
          `
          )
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString());

        // Use AI search for better natural language understanding
        const aiExpandedTerms = expandAISearchTerms(searchTerm.trim());
        const fallbackTerms = expandSearchTerms(searchTerm.trim());
        const allTerms = [...new Set([...aiExpandedTerms, ...fallbackTerms])];

        const conditions = [];
        allTerms.forEach((term) => {
          const escapedTerm = term.replace(/[%_]/g, "\\$&");
          conditions.push(`title.ilike.%${escapedTerm}%`);
          conditions.push(`description.ilike.%${escapedTerm}%`);
          conditions.push(`category.ilike.%${escapedTerm}%`);
        });
        if (conditions.length > 0) {
          productQuery = productQuery.or(conditions.join(","));
          liveFeedQuery = liveFeedQuery.or(conditions.join(","));
        }

        // Apply filters to search results
        if (selectedCategory !== "All Categories") {
          productQuery = productQuery.eq("category", selectedCategory);
          // Live feed items always show regardless of category
        }
        if (selectedUniversity !== "All Universities") {
          productQuery = productQuery.eq("campus", selectedUniversity);
          liveFeedQuery = liveFeedQuery.eq("location", selectedUniversity);
        }
        if (priceRange.min) {
          productQuery = productQuery.gte("price", parseFloat(priceRange.min));
          liveFeedQuery = liveFeedQuery.gte(
            "price",
            parseFloat(priceRange.min)
          );
        }
        if (priceRange.max) {
          productQuery = productQuery.lte("price", parseFloat(priceRange.max));
          liveFeedQuery = liveFeedQuery.lte(
            "price",
            parseFloat(priceRange.max)
          );
        }

        const [{ data: productData }, { data: liveFeedData }] =
          await Promise.all([productQuery, liveFeedQuery]);

        // Apply AI search to results for better semantic matching
        const rawSearchResults = productData || [];
        const rawLiveFeedResults = (liveFeedData || []).map((item) => ({
          ...item,
          type: "live_feed" as const,
        }));

        // Use AI search to rerank results based on semantic similarity
        searchResults = performAISearch(rawSearchResults, searchTerm.trim());
        liveFeedResults = performAISearch(
          rawLiveFeedResults,
          searchTerm.trim()
        );

        // Get other products and live feed items (excluding search results)
        const searchResultIds = searchResults.map((item) => item.id);
        const liveFeedResultIds = liveFeedResults.map((item) => item.id);

        let otherProductQuery = supabase
          .from("products")
          .select(
            `
            *,
            profiles!products_seller_id_fkey (
              full_name,
              avatar_url,
              is_verified,
              rating
            )
          `
          )
          .eq("is_active", true)
          .limit(10);

        let otherLiveFeedQuery = supabase
          .from("live_feed")
          .select(
            `
            *,
            profiles!live_feed_seller_id_fkey (
              full_name,
              avatar_url,
              is_verified,
              rating
            )
          `
          )
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString())
          .limit(10);

        if (searchResultIds.length > 0) {
          otherProductQuery = otherProductQuery.not(
            "id",
            "in",
            `(${searchResultIds.join(",")})`
          );
        }
        if (liveFeedResultIds.length > 0) {
          otherLiveFeedQuery = otherLiveFeedQuery.not(
            "id",
            "in",
            `(${liveFeedResultIds.join(",")})`
          );
        }

        // Apply same filters to other items
        if (selectedCategory !== "All Categories") {
          otherProductQuery = otherProductQuery.eq(
            "category",
            selectedCategory
          );
          // Live feed items always show regardless of category
        }
        if (selectedUniversity !== "All Universities") {
          otherProductQuery = otherProductQuery.eq(
            "campus",
            selectedUniversity
          );
          otherLiveFeedQuery = otherLiveFeedQuery.eq(
            "location",
            selectedUniversity
          );
        }
        if (priceRange.min) {
          otherProductQuery = otherProductQuery.gte(
            "price",
            parseFloat(priceRange.min)
          );
          otherLiveFeedQuery = otherLiveFeedQuery.gte(
            "price",
            parseFloat(priceRange.min)
          );
        }
        if (priceRange.max) {
          otherProductQuery = otherProductQuery.lte(
            "price",
            parseFloat(priceRange.max)
          );
          otherLiveFeedQuery = otherLiveFeedQuery.lte(
            "price",
            parseFloat(priceRange.max)
          );
        }

        const [{ data: otherProductData }, { data: otherLiveFeedData }] =
          await Promise.all([otherProductQuery, otherLiveFeedQuery]);

        otherProducts = otherProductData || [];
        otherLiveFeeds = (otherLiveFeedData || []).map((item) => ({
          ...item,
          type: "live_feed" as const,
        }));
      } else {
        // No search term, get all products and live bids
        let productQuery = supabase
          .from("products")
          .select(
            `
            *,
            profiles!products_seller_id_fkey (
              full_name,
              avatar_url,
              is_verified,
              rating
            )
          `
          )
          .eq("is_active", true);

        let liveFeedQuery = supabase
          .from("live_feed")
          .select(
            `
            *,
            profiles!live_feed_seller_id_fkey (
              full_name,
              avatar_url,
              is_verified,
              rating
            )
          `
          )
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString());

        // Apply filters
        if (selectedCategory !== "All Categories") {
          productQuery = productQuery.eq("category", selectedCategory);
          // Live feed items always show regardless of category
        }
        if (selectedUniversity !== "All Universities") {
          productQuery = productQuery.eq("campus", selectedUniversity);
          liveFeedQuery = liveFeedQuery.eq("location", selectedUniversity);
        }
        if (priceRange.min) {
          productQuery = productQuery.gte("price", parseFloat(priceRange.min));
          liveFeedQuery = liveFeedQuery.gte(
            "price",
            parseFloat(priceRange.min)
          );
        }
        if (priceRange.max) {
          productQuery = productQuery.lte("price", parseFloat(priceRange.max));
          liveFeedQuery = liveFeedQuery.lte(
            "price",
            parseFloat(priceRange.max)
          );
        }

        const [{ data: productData }, { data: liveFeedData }] =
          await Promise.all([productQuery, liveFeedQuery]);

        searchResults = productData || [];
        liveFeedResults = (liveFeedData || []).map((item) => ({
          ...item,
          type: "live_feed" as const,
        }));
      }

      // Separate search results and other products by university
      let tryTheseOutResults = [];

      if (userUniversity) {
        // Search results from user's university (related products)
        const searchResultsFromUniversity = [
          ...searchResults,
          ...liveFeedResults,
        ].filter((item) => {
          const itemUniversity =
            item.type === "live_feed" ? item.location : item.campus;
          return itemUniversity === userUniversity;
        });

        // Search results from other schools
        const searchResultsFromOtherSchools = [
          ...searchResults,
          ...liveFeedResults,
        ].filter((item) => {
          const itemUniversity =
            item.type === "live_feed" ? item.location : item.campus;
          return itemUniversity !== userUniversity;
        });

        // Non-related products (for "try these out" section)
        const unrelatedProducts = [...otherProducts, ...otherLiveFeeds];

        // University results: only search results from user's university
        universityResults = searchResultsFromUniversity;

        // Shuffle function for better distribution
        const shuffleArray = (array: SearchResult[]) => {
          const shuffled = [...array];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          return shuffled;
        };

        // Other school results: only search results from other schools (shuffled)
        otherSchoolResults = shuffleArray(searchResultsFromOtherSchools);

        // Try these out: all products from all schools (shuffled)
        tryTheseOutResults = shuffleArray([
          ...searchResults,
          ...liveFeedResults,
          ...otherProducts,
          ...otherLiveFeeds,
        ]);
      } else {
        // If no user university, show all products together
        universityResults = [
          ...searchResults,
          ...liveFeedResults,
          ...otherProducts,
          ...otherLiveFeeds,
        ];
        otherSchoolResults = [];
        tryTheseOutResults = [];
      }

      // Determine which products to show and sort
      const productsToShow = userUniversity
        ? [
            ...universityResults,
            ...(showOtherSchools ? otherSchoolResults : []),
          ]
        : [
            ...searchResults,
            ...liveFeedResults,
            ...otherProducts,
            ...otherLiveFeeds,
          ];

      // Apply sorting to the products
      const sortedProducts = productsToShow.sort((a, b) => {
        // If there's a search term, prioritize by relevance first
        if (searchTerm && searchTerm.trim()) {
          const searchLower = searchTerm.toLowerCase();
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();

          // Calculate relevance scores
          const aExactMatch = aTitle === searchLower ? 1000 : 0;
          const bExactMatch = bTitle === searchLower ? 1000 : 0;

          const aStartsWith = aTitle.startsWith(searchLower) ? 500 : 0;
          const bStartsWith = bTitle.startsWith(searchLower) ? 500 : 0;

          const aIncludes = aTitle.includes(searchLower) ? 100 : 0;
          const bIncludes = bTitle.includes(searchLower) ? 100 : 0;

          // Boost live feed items slightly
          const aLiveBoost = a.type === "live_feed" ? 50 : 0;
          const bLiveBoost = b.type === "live_feed" ? 50 : 0;

          const aScore = aExactMatch + aStartsWith + aIncludes + aLiveBoost;
          const bScore = bExactMatch + bStartsWith + bIncludes + bLiveBoost;

          if (aScore !== bScore) return bScore - aScore;
        }

        // Then apply regular sorting
        switch (sortBy) {
          case "price-low":
            return a.price - b.price;
          case "price-high":
            return b.price - a.price;
          case "oldest":
            return (
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
            );
          default:
            return (
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
            );
        }
      });

      // Transform the data to match our interfaces
      const transformedData = sortedProducts.map((item) => {
        if (item.type === "live_feed") {
          return {
            id: item.id,
            title: item.title,
            description: item.description || "",
            price: item.price,
            image_url: item.image_url,
            location: item.location,
            expires_at: item.expires_at,
            created_at: item.created_at,
            seller_id: item.seller_id,
            type: "live_feed" as const,
            seller: item.profiles
              ? {
                  full_name: item.profiles.full_name,
                  rating: item.profiles.rating,
                  is_verified: item.profiles.is_verified,
                }
              : {
                  full_name: "Unknown Seller",
                  rating: 0,
                  is_verified: false,
                },
          };
        } else {
          return {
            id: item.id,
            title: item.title,
            description: item.description || "",
            price: item.price,
            category: item.category,
            campus: item.campus || "Unknown Campus",
            condition: item.condition,
            images: item.images || [],
            seller_id: item.seller_id,
            stock_quantity: item.stock_quantity,
            created_at: item.created_at,
            seller: item.profiles
              ? {
                  full_name: item.profiles.full_name,
                  rating: item.profiles.rating,
                  is_verified: item.profiles.is_verified,
                }
              : {
                  full_name: "Unknown Seller",
                  rating: 0,
                  is_verified: false,
                },
          };
        }
      });

      // Helper function to transform products
      const transformProduct = (item: any) => {
        if (item.type === "live_feed") {
          return {
            id: item.id,
            title: item.title,
            description: item.description || "",
            price: item.price,
            image_url: item.image_url,
            location: item.location,
            expires_at: item.expires_at,
            created_at: item.created_at,
            seller_id: item.seller_id,
            type: "live_feed" as const,
            seller: item.profiles
              ? {
                  full_name: item.profiles.full_name,
                  rating: item.profiles.rating,
                  is_verified: item.profiles.is_verified,
                }
              : {
                  full_name: "Unknown Seller",
                  rating: 0,
                  is_verified: false,
                },
          };
        } else {
          return {
            id: item.id,
            title: item.title,
            description: item.description || "",
            price: item.price,
            category: item.category,
            campus: item.campus || "Unknown Campus",
            condition: item.condition,
            images: item.images || [],
            seller_id: item.seller_id,
            stock_quantity: item.stock_quantity,
            created_at: item.created_at,
            seller: item.profiles
              ? {
                  full_name: item.profiles.full_name,
                  rating: item.profiles.rating,
                  is_verified: item.profiles.is_verified,
                }
              : {
                  full_name: "Unknown Seller",
                  rating: 0,
                  is_verified: false,
                },
          };
        }
      };

      setProducts(transformedData);
      setUniversityProducts(universityResults.map(transformProduct));
      setOtherSchoolProducts(otherSchoolResults.map(transformProduct));
      setTryTheseOutProducts(tryTheseOutResults.map(transformProduct));
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    // Read university directly from profile at call time — never stale
    const uni = profile?.university_name || null;
    if (uni) {
      setPendingQuery(q);
      setShowScopeDialog(true);
      // Do NOT touch searchParams here — confirmScope will do it
    } else {
      const params = new URLSearchParams(searchParams);
      params.set("q", q);
      setSearchParams(params);
    }
  };

  const confirmScope = (allSchools: boolean) => {
    setShowScopeDialog(false);
    setShowOtherSchools(allSchools);
    setShowEndBanner(false);
    const params = new URLSearchParams(searchParams);
    params.set("q", pendingQuery);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSelectedCategory("All Categories");
    setSelectedUniversity("All Universities");
    setPriceRange({ min: "", max: "" });
    setSortBy("newest");
    setShowOtherSchools(false);
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
      navigate("/auth");
      return;
    }

    try {
      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from("cart")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .single();

      if (existingItem) {
        // Update quantity if item exists
        const { error } = await supabase
          .from("cart")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);

        if (error) throw error;
      } else {
        // Add new item to cart
        const { error } = await supabase.from("cart").insert({
          user_id: user.id,
          product_id: productId,
          quantity: 1,
        });

        if (error) throw error;
      }

      // Update local cart items state
      setCartItems((prev) => [...prev, productId]);

      // Trigger cart count refresh
      refetchCartCount();
    } catch (error) {
      // Error handled silently
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Scope picker dialog — shown when user searches and has a university */}
      <Dialog open={showScopeDialog} onOpenChange={setShowScopeDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Where should we search?</DialogTitle>
            <DialogDescription>
              Search for "{pendingQuery}" — choose your scope.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => confirmScope(false)}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-primary bg-primary/5 p-4 hover:bg-primary/10 transition-colors"
            >
              <GraduationCap className="h-7 w-7 text-primary" />
              <span className="text-sm font-semibold text-center leading-tight">My University Only</span>
              <span className="text-xs text-muted-foreground text-center">{userUniversity}</span>
            </button>
            <button
              onClick={() => confirmScope(true)}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-muted p-4 hover:border-primary hover:bg-muted/50 transition-colors"
            >
              <Globe className="h-7 w-7 text-muted-foreground" />
              <span className="text-sm font-semibold text-center leading-tight">All Universities</span>
              <span className="text-xs text-muted-foreground text-center">Search everywhere</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Search Header */}
            <div className="mb-6">
              <form onSubmit={handleSearch} className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="Describe what you're looking for (e.g., 'red bag', 'black laptop')..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
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

              {searchParams.get("q") && (
                <p className="text-muted-foreground">
                  Results for "<span className="font-medium">{searchParams.get("q")}</span>"
                  {!loading && <span> • {products.length} found{userUniversity && !showOtherSchools ? ` at ${userUniversity}` : " across all universities"}</span>}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Filters Sidebar */}
              <div
                className={`lg:col-span-1 ${
                  showFilters ? "block" : "hidden lg:block"
                }`}
              >
                <Card className="sticky top-4">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Filters</h3>
                      <Button variant="ghost" size="sm" onClick={clearFilters}>
                        Clear All
                      </Button>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full h-10 px-3 pr-10 border border-input bg-background rounded-md text-sm focus:border-university-green focus:outline-none appearance-none"
                        style={{
                          backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                          backgroundSize: "12px 8px",
                        }}
                      >
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Universities
                      </label>
                      <select
                        value={selectedUniversity}
                        onChange={(e) => setSelectedUniversity(e.target.value)}
                        className="w-full h-10 px-3 pr-10 border border-input bg-background rounded-md text-sm focus:border-university-green focus:outline-none appearance-none"
                        style={{
                          backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                          backgroundSize: "12px 8px",
                        }}
                      >
                        {universities.map((university) => (
                          <option key={university} value={university}>
                            {university}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Price Range (₦)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="number"
                          placeholder="Min"
                          value={priceRange.min}
                          onChange={(e) =>
                            setPriceRange({
                              ...priceRange,
                              min: e.target.value,
                            })
                          }
                        />
                        <Input
                          type="number"
                          placeholder="Max"
                          value={priceRange.max}
                          onChange={(e) =>
                            setPriceRange({
                              ...priceRange,
                              max: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full h-10 px-3 pr-10 border border-input bg-background rounded-md text-sm focus:border-university-green focus:outline-none appearance-none"
                        style={{
                          backgroundImage: `url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iOCIgdmlld0JveD0iMCAwIDEyIDgiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxwYXRoIGQ9Ik0xIDFMNiA2TDExIDEiIHN0cm9rZT0iIzZCNzI4MCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPC9zdmc+')`,
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                          backgroundSize: "12px 8px",
                        }}
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                      </select>
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
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="pt-6 text-center mb-7">
                        <SearchIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">
                          {searchParams.get("q") ? `No results for "${searchParams.get("q")}"${userUniversity && !showOtherSchools ? ` at ${userUniversity}` : ""}` : "No products found"}
                        </h3>
                        {userUniversity && !showOtherSchools ? (
                          <>
                            <p className="text-muted-foreground mb-4">Nothing found at your university. Try searching across all schools.</p>
                            <Button onClick={() => confirmScope(true)} className="gap-2">
                              <Globe className="h-4 w-4" /> Search All Universities
                            </Button>
                          </>
                        ) : (
                          <>
                            <p className="text-muted-foreground mb-4">Try adjusting your search terms or filters.</p>
                            <Button onClick={clearFilters}>Clear Filters</Button>
                          </>
                        )}
                      </CardContent>
                    </Card>

                    {/* Try These Out Section - Show when no products found */}
                    {tryTheseOutProducts.length > 0 && (
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-muted-foreground px-1">
                          You can try these out
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 px-1 sm:px-0">
                          {tryTheseOutProducts.map((item) => {
                            const isLiveFeed =
                              "type" in item && item.type === "live_feed";
                            const price = item.price;
                            const handleClick = () => {
                              if (isLiveFeed) {
                                navigate(`/live-feed#live-feed-${item.id}`);
                              } else {
                                handleViewProduct(item.id);
                              }
                            };

                            return (
                              <Card
                                key={item.id}
                                className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                                onClick={handleClick}
                              >
                                <div className="relative">
                                  {(isLiveFeed
                                    ? item.image_url
                                    : item.images?.[0]) && (
                                    <img
                                      src={
                                        isLiveFeed
                                          ? item.image_url
                                          : item.images[0]
                                      }
                                      alt={item.title}
                                      className="w-full h-32 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  )}
                                  {!isLiveFeed && (
                                    <Badge
                                      className="absolute top-2 left-2 text-xs"
                                      variant={
                                        item.condition === "new"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {item.condition?.charAt(0).toUpperCase() +
                                        item.condition?.slice(1) || "Good"}
                                    </Badge>
                                  )}
                                  {isLiveFeed ? (
                                    <Badge className="absolute top-2 right-2 text-xs bg-green-500 text-white animate-pulse">
                                      LIVE
                                    </Badge>
                                  ) : (
                                    <Badge className="absolute bottom-2 right-2 text-xs bg-gray-500 text-white w-fit">
                                      <span className="truncate">
                                        {item.campus}
                                      </span>
                                    </Badge>
                                  )}
                                </div>

                                <CardContent className="p-2 sm:p-3">
                                  <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 sm:mb-2">
                                    {item.title}
                                  </h3>

                                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-1 py-0.5"
                                    >
                                      {isLiveFeed ? "Live" : item.category}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 sm:mb-2">
                                    <span className="truncate">
                                      by {item.seller?.full_name || "Unknown"}
                                    </span>
                                    {item.seller?.is_verified && (
                                      <div className="bg-blue-500 rounded-full p-0.5">
                                        <svg
                                          className="h-2 w-2 text-white"
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
                                    )}
                                  </div>

                                  <div className="text-sm sm:text-lg font-bold text-primary mb-1 sm:mb-2">
                                    ₦{price.toLocaleString()}
                                  </div>

                                  {isLiveFeed ? (
                                    <Button
                                      variant="brand"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/live-feed#live-feed-${item.id}`
                                        );
                                      }}
                                      className="w-full text-xs px-2 py-1"
                                    >
                                      View Live
                                    </Button>
                                  ) : cartItems.includes(item.id) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate("/cart");
                                      }}
                                      className="w-full text-xs px-2 py-1"
                                    >
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      In Cart
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="brand"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(item.id);
                                      }}
                                      className="w-full text-xs px-2 py-1"
                                    >
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      Add to Cart
                                    </Button>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Other Schools Products */}
                    {showOtherSchools && otherSchoolProducts.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3 sm:mb-4 px-1">
                          <h3 className="text-base sm:text-lg font-semibold text-muted-foreground">
                            Products from Other Schools
                          </h3>
                          <Button variant="outline" size="sm" onClick={() => { setShowOtherSchools(false); setShowEndBanner(false); }} className="text-xs px-2 py-1">
                            Hide
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 px-1 sm:px-0">
                          {otherSchoolProducts.map((item) => {
                            const isLiveFeed =
                              "type" in item && item.type === "live_feed";
                            const price = item.price;
                            const handleClick = () => {
                              if (isLiveFeed) {
                                navigate(`/live-feed#live-feed-${item.id}`);
                              } else {
                                handleViewProduct(item.id);
                              }
                            };

                            return (
                              <Card
                                key={item.id}
                                className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                                onClick={handleClick}
                              >
                                <div className="relative">
                                  {(isLiveFeed
                                    ? item.image_url
                                    : item.images?.[0]) && (
                                    <img
                                      src={
                                        isLiveFeed
                                          ? item.image_url
                                          : item.images[0]
                                      }
                                      alt={item.title}
                                      className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  )}
                                  {!isLiveFeed && (
                                    <Badge
                                      className="absolute top-2 left-2 text-xs"
                                      variant={
                                        item.condition === "new"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {item.condition?.charAt(0).toUpperCase() +
                                        item.condition?.slice(1) || "Good"}
                                    </Badge>
                                  )}
                                  {isLiveFeed ? (
                                    <Badge className="absolute top-2 right-2 text-xs bg-green-500 text-white animate-pulse">
                                      LIVE
                                    </Badge>
                                  ) : (
                                    <Badge className="absolute bottom-2 right-2 text-xs bg-gray-500 text-white w-fit">
                                      <span className="truncate">
                                        {item.campus}
                                      </span>
                                    </Badge>
                                  )}
                                </div>

                                <CardContent className="p-3">
                                  <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                                    {item.title}
                                  </h3>

                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {isLiveFeed ? "Live" : item.category}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                    <span className="truncate">
                                      by {item.seller?.full_name || "Unknown"}
                                    </span>
                                    {item.seller?.is_verified && (
                                      <div className="bg-blue-500 rounded-full p-0.5">
                                        <svg
                                          className="h-2 w-2 text-white"
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
                                    )}
                                  </div>

                                  <div className="text-lg font-bold text-primary mb-2">
                                    ₦{price.toLocaleString()}
                                  </div>

                                  {isLiveFeed ? (
                                    <Button
                                      variant="brand"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/live-feed#live-feed-${item.id}`
                                        );
                                      }}
                                      className="w-full text-xs"
                                    >
                                      View Live
                                    </Button>
                                  ) : cartItems.includes(item.id) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate("/cart");
                                      }}
                                      className="w-full text-xs"
                                    >
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      In Cart
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="brand"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(item.id);
                                      }}
                                      className="w-full text-xs"
                                    >
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      Add to Cart
                                    </Button>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* University Products */}
                    {userUniversity && universityProducts.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-4 px-1">
                          <h3 className="text-base sm:text-lg font-semibold text-university-green flex-1">
                            Products from {userUniversity}
                          </h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 px-1 sm:px-0">
                          {universityProducts.map((item) => {
                            const isLiveFeed =
                              "type" in item && item.type === "live_feed";
                            const price = item.price;
                            const handleClick = () => {
                              if (isLiveFeed) {
                                navigate(`/live-feed#live-feed-${item.id}`);
                              } else {
                                handleViewProduct(item.id);
                              }
                            };

                            return (
                              <Card
                                key={item.id}
                                className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                                onClick={handleClick}
                              >
                                <div className="relative">
                                  {(isLiveFeed
                                    ? item.image_url
                                    : item.images?.[0]) && (
                                    <img
                                      src={
                                        isLiveFeed
                                          ? item.image_url
                                          : item.images[0]
                                      }
                                      alt={item.title}
                                      className="w-full h-32 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  )}
                                  {!isLiveFeed && (
                                    <Badge
                                      className="absolute top-2 left-2 text-xs"
                                      variant={
                                        item.condition === "new"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {item.condition?.charAt(0).toUpperCase() +
                                        item.condition?.slice(1) || "Good"}
                                    </Badge>
                                  )}
                                  {isLiveFeed && (
                                    <Badge className="absolute top-2 right-2 text-xs bg-green-500 text-white animate-pulse">
                                      LIVE
                                    </Badge>
                                  )}
                                </div>

                                <CardContent className="p-2 sm:p-3">
                                  <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 sm:mb-2">
                                    {item.title}
                                  </h3>

                                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-1 py-0.5"
                                    >
                                      {isLiveFeed ? "Live" : item.category}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 sm:mb-2">
                                    <span className="truncate">
                                      by {item.seller?.full_name || "Unknown"}
                                    </span>
                                    {item.seller?.is_verified && (
                                      <div className="bg-blue-500 rounded-full p-0.5">
                                        <svg
                                          className="h-2 w-2 text-white"
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
                                    )}
                                  </div>

                                  <div className="text-sm sm:text-lg font-bold text-primary mb-1 sm:mb-2">
                                    ₦{price.toLocaleString()}
                                  </div>

                                  {isLiveFeed ? (
                                    <Button
                                      variant="brand"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/live-feed#live-feed-${item.id}`
                                        );
                                      }}
                                      className="w-full text-xs px-2 py-1"
                                    >
                                      View Live
                                    </Button>
                                  ) : cartItems.includes(item.id) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate("/cart");
                                      }}
                                      className="w-full text-xs px-2 py-1"
                                    >
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      In Cart
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="brand"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(item.id);
                                      }}
                                      className="w-full text-xs px-2 py-1"
                                    >
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      Add to Cart
                                    </Button>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* End-of-results sentinel + banner */}
                    <div ref={endOfResultsRef} className="h-1" />
                    {showEndBanner && !showOtherSchools && userUniversity && otherSchoolProducts.length > 0 && (
                      <div className="rounded-xl border bg-muted/50 p-5 text-center space-y-3 my-4">
                        <Globe className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="font-semibold">Can't find what you need?</p>
                        <p className="text-sm text-muted-foreground">There are {otherSchoolProducts.length} more result{otherSchoolProducts.length !== 1 ? "s" : ""} from other universities.</p>
                        <Button onClick={() => { setShowOtherSchools(true); setShowEndBanner(false); }} className="gap-2">
                          <Globe className="h-4 w-4" /> Search Other Universities
                        </Button>
                      </div>
                    )}

                    {/* Try These Out Section */}
                    {tryTheseOutProducts.length > 0 && (
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 mt-8 text-muted-foreground px-1">
                          You can try these out
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 px-1 sm:px-0">
                          {tryTheseOutProducts.map((item) => {
                            const isLiveFeed =
                              "type" in item && item.type === "live_feed";
                            const price = item.price;
                            const handleClick = () => {
                              if (isLiveFeed) {
                                navigate(`/live-feed#live-feed-${item.id}`);
                              } else {
                                handleViewProduct(item.id);
                              }
                            };

                            return (
                              <Card
                                key={item.id}
                                className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                                onClick={handleClick}
                              >
                                <div className="relative">
                                  {(isLiveFeed
                                    ? item.image_url
                                    : item.images?.[0]) && (
                                    <img
                                      src={
                                        isLiveFeed
                                          ? item.image_url
                                          : item.images[0]
                                      }
                                      alt={item.title}
                                      className="w-full h-32 sm:h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  )}
                                  {!isLiveFeed && (
                                    <Badge
                                      className="absolute top-2 left-2 text-xs"
                                      variant={
                                        item.condition === "new"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {item.condition?.charAt(0).toUpperCase() +
                                        item.condition?.slice(1) || "Good"}
                                    </Badge>
                                  )}
                                  {isLiveFeed ? (
                                    <Badge className="absolute top-2 right-2 text-xs bg-green-500 text-white animate-pulse">
                                      LIVE
                                    </Badge>
                                  ) : (
                                    <Badge className="absolute bottom-2 right-2 text-xs bg-gray-500 text-white w-fit">
                                      <span className="truncate">
                                        {item.campus}
                                      </span>
                                    </Badge>
                                  )}
                                </div>

                                <CardContent className="p-2 sm:p-3">
                                  <h3 className="font-semibold text-xs sm:text-sm line-clamp-2 mb-1 sm:mb-2">
                                    {item.title}
                                  </h3>

                                  <div className="flex items-center gap-2 mb-1 sm:mb-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs px-1 py-0.5"
                                    >
                                      {isLiveFeed ? "Live" : item.category}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1 sm:mb-2">
                                    <span className="truncate">
                                      by {item.seller?.full_name || "Unknown"}
                                    </span>
                                    {item.seller?.is_verified && (
                                      <div className="bg-blue-500 rounded-full p-0.5">
                                        <svg
                                          className="h-2 w-2 text-white"
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
                                    )}
                                  </div>

                                  <div className="text-sm sm:text-lg font-bold text-primary mb-1 sm:mb-2">
                                    ₦{price.toLocaleString()}
                                  </div>

                                  {isLiveFeed ? (
                                    <Button
                                      variant="brand"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          `/live-feed#live-feed-${item.id}`
                                        );
                                      }}
                                      className="w-full text-xs px-2 py-1"
                                    >
                                      View Live
                                    </Button>
                                  ) : cartItems.includes(item.id) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate("/cart");
                                      }}
                                      className="w-full text-xs px-2 py-1"
                                    >
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      In Cart
                                    </Button>
                                  ) : (
                                    <Button
                                      variant="brand"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        addToCart(item.id);
                                      }}
                                      className="w-full text-xs px-2 py-1"
                                    >
                                      <ShoppingCart className="h-3 w-3 mr-1" />
                                      Add to Cart
                                    </Button>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Fallback: Show all products if no university or no separation needed */}
                    {(!userUniversity ||
                      (universityProducts.length === 0 &&
                        otherSchoolProducts.length === 0 &&
                        tryTheseOutProducts.length === 0)) && (
                      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 px-1 sm:px-0">
                        {products.map((item) => {
                          const isLiveFeed =
                            "type" in item && item.type === "live_feed";
                          const price = item.price;
                          const handleClick = () => {
                            if (isLiveFeed) {
                              navigate(`/live-feed#live-feed-${item.id}`);
                            } else {
                              handleViewProduct(item.id);
                            }
                          };

                          return (
                            <Card
                              key={item.id}
                              className="group hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                              onClick={handleClick}
                            >
                              <div className="relative">
                                {(isLiveFeed
                                  ? item.image_url
                                  : item.images?.[0]) && (
                                  <img
                                    src={
                                      isLiveFeed
                                        ? item.image_url
                                        : item.images[0]
                                    }
                                    alt={item.title}
                                    className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                )}
                                {!isLiveFeed && (
                                  <Badge
                                    className="absolute top-2 left-2 text-xs"
                                    variant={
                                      item.condition === "new"
                                        ? "default"
                                        : "secondary"
                                    }
                                  >
                                    {item.condition?.charAt(0).toUpperCase() +
                                      item.condition?.slice(1) || "Good"}
                                  </Badge>
                                )}
                                {isLiveFeed && (
                                  <Badge className="absolute top-2 right-2 text-xs bg-green-500 text-white animate-pulse">
                                    LIVE
                                  </Badge>
                                )}
                              </div>

                              <CardContent className="p-3">
                                <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                                  {item.title}
                                </h3>

                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs">
                                    {isLiveFeed ? "Live" : item.category}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                                  <span className="truncate">
                                    by {item.seller?.full_name || "Unknown"}
                                  </span>
                                  {item.seller?.is_verified && (
                                    <div className="bg-blue-500 rounded-full p-0.5">
                                      <svg
                                        className="h-2 w-2 text-white"
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
                                  )}
                                </div>

                                <div className="text-lg font-bold text-primary mb-2">
                                  ₦{price.toLocaleString()}
                                </div>

                                {isLiveFeed ? (
                                  <Button
                                    variant="brand"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(
                                        `/live-feed#live-feed-${item.id}`
                                      );
                                    }}
                                    className="w-full text-xs"
                                  >
                                    View Live
                                  </Button>
                                ) : cartItems.includes(item.id) ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate("/cart");
                                    }}
                                    className="w-full text-xs"
                                  >
                                    <ShoppingCart className="h-3 w-3 mr-1" />
                                    In Cart
                                  </Button>
                                ) : (
                                  <Button
                                    variant="brand"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToCart(item.id);
                                    }}
                                    className="w-full text-xs"
                                  >
                                    <ShoppingCart className="h-3 w-3 mr-1" />
                                    Add to Cart
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Search;
