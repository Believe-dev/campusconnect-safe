import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import { cn } from "@/lib/utils";
import { uploadProductImageToR2 } from "@/utils/r2Upload";
import { fetchCbnKycStatusFromDb, CbnKycTierDetails } from "@/services/anchorBaasService";


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
  Share2,
  Copy,
  Check,
  ExternalLink,
  ClipboardList,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ArrowRight,
} from "lucide-react";
import WalletDashboard from "@/components/wallet/WalletDashboard";
import { SellerKycReminderBanner } from "@/components/seller/SellerKycReminderBanner";

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

interface SellerOrder {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  product_title: string | null;
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

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Payment received",
  confirmed: "Confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
  disputed: "Disputed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const ORDER_STATUS_TONE: Record<string, string> = {
  pending: "bg-flora-chip text-flora-muted",
  paid: "bg-flora-tagBg text-flora-tagText",
  confirmed: "bg-flora-tagBg text-flora-tagText",
  shipped: "bg-flora-chip text-flora-ink",
  delivered: "bg-flora-tagBg text-flora-tagText",
  disputed: "bg-red-50 text-red-600",
  cancelled: "bg-flora-chip text-flora-muted",
  refunded: "bg-amber-50 text-amber-600",
};

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
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("listings");
  const [sellerOrders, setSellerOrders] = useState<SellerOrder[]>([]);
  const [kycStatus, setKycStatus] = useState<CbnKycTierDetails | null>(null);
  const [heldEscrow, setHeldEscrow] = useState<{ amount: number; count: number }>({ amount: 0, count: 0 });
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const handleRefresh = useCallback(async () => {
    await Promise.all([fetchProducts(), fetchAnalytics(), fetchSellerOrders(), fetchVerificationContext()]);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    loadUserProfile();
    fetchProducts();
    fetchAnalytics();
    fetchSellerOrders();
    fetchVerificationContext();

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
                fetchSellerOrders();
                fetchVerificationContext();
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

      setSellerId(user.id);

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

  // Lightweight order summary for the dashboard's Orders tab - counts and a
  // recent list only. Full order management (confirm delivery, chat,
  // disputes, escrow status) already exists at /orders?tab=seller; this is a
  // glance-and-jump-in surface, not a duplicate of that page.
  const fetchSellerOrders = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total_amount, created_at, products(title)")
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setSellerOrders(
        (data || []).map((o: any) => ({
          id: o.id,
          status: o.status,
          total_amount: o.total_amount,
          created_at: o.created_at,
          product_title: o.products?.title || null,
        }))
      );
    } catch (error) {
      // Error handled silently
    }
  };

  // KYC status + this seller's own held escrow - the self-scoped version of
  // what AtRiskSellersCard shows admins across every seller. An unverified
  // seller should see this exact risk on their own dashboard, not just find
  // out about it when a withdrawal silently fails.
  const fetchVerificationContext = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [kyc, { data: held, error: heldError }] = await Promise.all([
        fetchCbnKycStatusFromDb(user.id),
        supabase
          .from("escrow_transactions")
          .select("seller_amount")
          .eq("seller_id", user.id)
          .eq("status", "held"),
      ]);

      if (heldError) throw heldError;
      setKycStatus(kyc);
      setHeldEscrow({
        amount: (held || []).reduce((sum, r: any) => sum + Number(r.seller_amount || 0), 0),
        count: (held || []).length,
      });
    } catch (error) {
      // Error handled silently
    }
  };

  const uploadNewImages = async () => {
    const uploadedUrls = [];

    for (let i = 0; i < newImages.length; i++) {
      const publicUrl = await uploadProductImageToR2(newImages[i]);
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

      queryClient.invalidateQueries({ queryKey: ["products"] });
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

      queryClient.invalidateQueries({ queryKey: ["products"] });
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
  const openOrders = sellerOrders.filter(
    (o) => !["delivered", "cancelled", "refunded"].includes(o.status)
  );
  const needsVerification = kycStatus?.kyc_status !== "verified";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/4 rounded-full bg-flora-chip"></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="h-24 rounded-3xl bg-flora-chip/60"></div>
              <div className="h-24 rounded-3xl bg-flora-chip/60"></div>
              <div className="h-24 rounded-3xl bg-flora-chip/60"></div>
              <div className="h-24 rounded-3xl bg-flora-chip/60"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-2xl px-4 py-8">
          <div className="rounded-3xl bg-flora-card p-8 text-center shadow-card">
            <div className="mx-auto mb-4 h-12 w-12 text-3xl">🚫</div>
            <h2 className="mb-2 text-2xl font-bold text-flora-ink">Access Denied</h2>
            <p className="mb-4 text-flora-muted">
              You need to be an approved seller to access the dashboard.
            </p>
            <Button onClick={() => navigate("/profile")} variant="outline">
              Go to Profile
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="mx-auto max-w-5xl px-4 py-4 pb-24 sm:py-8 md:pb-8">
          {/* Header */}
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold text-flora-ink sm:text-3xl">
                Seller Dashboard
              </h1>
              <p className="mt-1 flex items-center gap-2 text-xs text-flora-muted sm:text-sm">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isRealTimeConnected ? "bg-flora-leaf" : "bg-flora-muted/40"
                  }`}
                />
                {isRealTimeConnected ? "Live updates" : "Connecting..."}
                <span className="hidden sm:inline">
                  • Updated {lastUpdated.toLocaleTimeString()}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {sellerId && (() => {
                const storeUrl = `https://unimarket.com.ng/seller/${sellerId}`;
                const handleCopy = async () => {
                  try {
                    await navigator.clipboard.writeText(storeUrl);
                  } catch {
                    const ta = document.createElement('textarea');
                    ta.value = storeUrl;
                    ta.style.cssText = 'position:fixed;left:-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    ta.remove();
                  }
                  setCopied(true);
                  toast({ title: 'Store link copied!', description: storeUrl });
                  setTimeout(() => setCopied(false), 2000);
                };
                const handleShare = async () => {
                  if (navigator.share) {
                    await navigator.share({ title: 'My UniMarket Store', url: storeUrl });
                  } else {
                    handleCopy();
                  }
                };
                return (
                  <div className="flex w-full items-center gap-2 rounded-2xl border border-flora-ink/10 bg-flora-card px-3 py-2 text-sm sm:w-auto">
                    <span className="hidden max-w-[180px] truncate text-flora-muted sm:inline">{storeUrl}</span>
                    <span className="text-xs text-flora-muted sm:hidden">My Store Link</span>
                    <button onClick={handleCopy} className="ml-auto shrink-0 rounded p-1 text-flora-ink transition hover:bg-flora-chip" title="Copy link">
                      {copied ? <Check className="h-4 w-4 text-flora-leaf" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button onClick={handleShare} className="shrink-0 rounded p-1 text-flora-ink transition hover:bg-flora-chip" title="Share">
                      <Share2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => navigate(`/seller/${sellerId}`)} className="shrink-0 rounded p-1 text-flora-ink transition hover:bg-flora-chip" title="Preview store">
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                );
              })()}
              <Button variant="brand" asChild className="w-full sm:w-auto">
                <a href="/sell">
                  <Plus className="h-4 w-4" />
                  Add Product
                </a>
              </Button>
            </div>
          </div>

          {/* Slim, non-dismissible verification strip - only shown when there's
              real held money behind it, and jumps straight to the Verification
              tab rather than duplicating the full banner up here. */}
          {needsVerification && heldEscrow.count > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("verification")}
              className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-left transition hover:bg-amber-100"
            >
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
              <span className="flex-1 text-sm text-amber-800">
                ₦{heldEscrow.amount.toLocaleString()} across {heldEscrow.count} order
                {heldEscrow.count !== 1 ? "s" : ""} is waiting in escrow and can't be withdrawn until you verify your identity.
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-amber-600" />
            </button>
          )}

          {/* Overview — Earnings gets the same "one featured tile + smaller
              supporting tiles" bento treatment as the home page's stat/
              feature grids, instead of four visually equal cards burying
              the number sellers actually care about most. */}
          <div className="mb-6 space-y-3 sm:space-y-4">
            <div className="rounded-3xl bg-gradient-to-br from-flora-leafBright to-flora-leaf p-4 text-white shadow-floating sm:p-6">
              <div className="flex items-center gap-2 text-white/85">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-medium sm:text-sm">Earnings</span>
              </div>
              <div className="mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">
                ₦{totalRevenue.toLocaleString()}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-3xl bg-flora-card p-3.5 shadow-card sm:p-5">
                <div className="flex items-center gap-2 text-flora-muted">
                  <Package className="h-4 w-4 text-flora-leaf" />
                  <span className="text-xs font-medium sm:text-sm">Listings</span>
                </div>
                <div className="mt-1 text-lg font-bold text-flora-ink sm:mt-2 sm:text-2xl">
                  {products.length}
                </div>
              </div>

              <div className="rounded-3xl bg-flora-card p-3.5 shadow-card sm:p-5">
                <div className="flex items-center gap-2 text-flora-muted">
                  <ShoppingCart className="h-4 w-4 text-flora-leaf" />
                  <span className="text-xs font-medium sm:text-sm">Open Orders</span>
                </div>
                <div className="mt-1 text-lg font-bold text-flora-ink sm:mt-2 sm:text-2xl">
                  {openOrders.length}
                </div>
              </div>

              <div className="rounded-3xl bg-flora-card p-3.5 shadow-card sm:p-5">
                <div className="flex items-center gap-2 text-flora-muted">
                  <Eye className="h-4 w-4 text-flora-leaf" />
                  <span className="text-xs font-medium sm:text-sm">Views</span>
                </div>
                <div className="mt-1 text-lg font-bold text-flora-ink sm:mt-2 sm:text-2xl">
                  {totalViews}
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="grid h-fit w-full grid-cols-5 gap-1 rounded-2xl bg-flora-chip/70 p-1">
              <TabsTrigger value="listings" className="rounded-xl text-[11px] sm:text-sm">
                Listings
              </TabsTrigger>
              <TabsTrigger value="orders" className="rounded-xl text-[11px] sm:text-sm">
                Orders
              </TabsTrigger>
              <TabsTrigger value="verification" className="relative rounded-xl text-[11px] sm:text-sm">
                Verify
                {needsVerification && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 sm:right-2 sm:top-2" />
                )}
              </TabsTrigger>
              <TabsTrigger value="earnings" className="rounded-xl text-[11px] sm:text-sm">
                Earnings
              </TabsTrigger>
              <TabsTrigger value="analytics" className="rounded-xl text-[11px] sm:text-sm">
                Analytics
              </TabsTrigger>
            </TabsList>

            {/* Listings */}
            <TabsContent value="listings" className="space-y-3 sm:space-y-4">
              {products.length === 0 ? (
                <div className="rounded-3xl bg-flora-card p-6 text-center shadow-card sm:p-8">
                  <Package className="mx-auto mb-3 h-10 w-10 text-flora-muted sm:mb-4 sm:h-12 sm:w-12" />
                  <h3 className="mb-2 text-base font-semibold text-flora-ink sm:text-lg">
                    No listings yet
                  </h3>
                  <p className="mb-4 text-sm text-flora-muted sm:text-base">
                    Start selling by adding your first product
                  </p>
                  <Button variant="brand" asChild className="w-full sm:w-auto">
                    <a href="/sell">Add Your First Product</a>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {products.map((product) => {
                    const productAnalytics = getProductAnalytics(product.id);
                    return (
                      <div key={product.id} className="rounded-3xl bg-flora-card p-3.5 shadow-card sm:p-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex cursor-pointer gap-3" onClick={() => navigate(`/product/${product.id}`)}>
                            {product.images && product.images[0] && (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20"
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-1 sm:mb-2 sm:gap-2">
                                <h3 className="truncate text-sm font-semibold text-flora-ink sm:text-lg">
                                  {product.title}
                                </h3>
                                <span
                                  className={cn(
                                    "rounded-full px-2 py-0.5 text-xs font-medium",
                                    product.is_active
                                      ? "bg-flora-tagBg text-flora-tagText"
                                      : "bg-flora-chip text-flora-muted"
                                  )}
                                >
                                  {product.is_active ? "Active" : "Inactive"}
                                </span>
                                <span className="rounded-full border border-flora-ink/15 px-2 py-0.5 text-xs capitalize text-flora-ink">
                                  {product.condition}
                                </span>
                              </div>
                              <p className="mb-2 line-clamp-2 text-xs text-flora-muted sm:text-sm">
                                {product.description}
                              </p>
                              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-flora-muted sm:text-sm">
                                <span className="font-medium text-flora-ink">
                                  ₦{product.price.toLocaleString()}
                                </span>
                                <span>{product.stock_quantity} in stock</span>
                                <span className="hidden sm:inline">{product.category}</span>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-flora-muted sm:gap-4">
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
                              className="flex-1 px-2 text-xs md:w-[fit] md:flex-none lg:px-10 lg:text-sm"
                            >
                              <Edit3 className="mr-1 h-3 w-3 lg:mr-2 lg:h-4 lg:w-4" />
                              Edit
                            </Button>
                            <Button
                              variant={product.is_active ? "destructive" : "default"}
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProductStatus(product.id, product.is_active);
                              }}
                              className="flex-1 px-2 text-xs md:w-[fit] md:flex-none lg:px-10 lg:text-sm"
                            >
                              {product.is_active ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Orders */}
            <TabsContent value="orders" className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-flora-card p-4 shadow-card">
                <div>
                  <p className="text-sm font-semibold text-flora-ink">
                    {openOrders.length} open, {sellerOrders.length} total
                  </p>
                  <p className="text-xs text-flora-muted">
                    Confirm shipments, message buyers, and manage disputes here.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/orders")}
                  className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-flora-ink/15 bg-white px-3 py-1.5 text-xs font-medium text-flora-ink transition hover:bg-flora-chip"
                >
                  Manage Orders
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {sellerOrders.length === 0 ? (
                <div className="rounded-3xl bg-flora-card p-8 text-center shadow-card">
                  <ClipboardList className="mx-auto mb-3 h-10 w-10 text-flora-muted" />
                  <p className="text-sm text-flora-muted">No orders yet.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sellerOrders.slice(0, 8).map((order) => (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => navigate("/orders")}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl bg-flora-card p-3.5 text-left shadow-card transition hover:brightness-[0.98]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-flora-ink">
                          {order.product_title || "Order"}
                        </p>
                        <p className="text-xs text-flora-muted">
                          {new Date(order.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span className="text-sm font-semibold text-flora-ink">
                          ₦{order.total_amount.toLocaleString()}
                        </span>
                        <span
                          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            ORDER_STATUS_TONE[order.status] || "bg-flora-chip text-flora-muted"
                          }`}
                        >
                          {ORDER_STATUS_LABEL[order.status] || order.status}
                        </span>
                      </div>
                    </button>
                  ))}
                  {sellerOrders.length > 8 && (
                    <button
                      type="button"
                      onClick={() => navigate("/orders")}
                      className="w-full py-2 text-center text-xs font-medium text-flora-leaf hover:underline"
                    >
                      View all {sellerOrders.length} orders →
                    </button>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Verification */}
            <TabsContent value="verification" className="space-y-4">
              {kycStatus?.kyc_status === "verified" ? (
                <div className="rounded-3xl bg-flora-card p-5 shadow-card">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flora-tagBg text-flora-leaf">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-flora-ink">Identity verified</p>
                      <p className="text-sm text-flora-muted">
                        You're fully verified — withdrawals aren't restricted.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                sellerId && <SellerKycReminderBanner userId={sellerId} />
              )}

              {needsVerification && heldEscrow.count > 0 && (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">
                      ₦{heldEscrow.amount.toLocaleString()} waiting on verification
                    </p>
                    <p className="mt-0.5 text-xs text-amber-700">
                      {heldEscrow.count} order{heldEscrow.count !== 1 ? "s" : ""} already paid and sitting in escrow.
                      This becomes withdrawable the moment your BVN/NIN check clears.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Earnings */}
            <TabsContent value="earnings">
              <WalletDashboard />
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics" className="space-y-3 sm:space-y-4">
              <div className="rounded-3xl bg-flora-card p-3.5 shadow-card sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-base font-semibold text-flora-ink sm:text-lg">
                    Product Analytics
                  </h2>
                  <select
                    value={analyticsFilter}
                    onChange={(e) => setAnalyticsFilter(e.target.value)}
                    className="h-10 w-full rounded-xl border border-flora-ink/15 bg-white px-3 text-sm text-flora-ink sm:w-48"
                  >
                    <option value="view_all">View All Products</option>
                    <option value="best_selling">Best Selling</option>
                    <option value="most_views">Most Views</option>
                    <option value="most_cart_adds">Most Cart Adds</option>
                    <option value="most_favorited">Most Favorited</option>
                    <option value="highest_revenue">Highest Revenue</option>
                  </select>
                </div>
                <div className="mt-4">
                  {analytics.length === 0 ? (
                    <div className="py-6 text-center sm:py-8">
                      <BarChart3 className="mx-auto mb-3 h-10 w-10 text-flora-muted sm:mb-4 sm:h-12 sm:w-12" />
                      <p className="text-base font-medium text-flora-ink sm:text-lg">
                        No analytics data
                      </p>
                      <p className="text-sm text-flora-muted sm:text-base">
                        Analytics will appear once you have products with activity
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {analyticsFilter === "view_all"
                        ? products.map((product, index) => {
                            const productAnalytics = getProductAnalytics(product.id);
                            return (
                              <div
                                key={product.id}
                                className="flex cursor-pointer items-center justify-between rounded-2xl border border-flora-ink/10 p-3 transition hover:bg-flora-chip/50 sm:p-4"
                                onClick={() =>
                                  setSelectedProductAnalytics({
                                    product,
                                    analytics: productAnalytics,
                                  })
                                }
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-flora-tagBg text-xs font-bold text-flora-tagText sm:h-8 sm:w-8 sm:text-sm">
                                    {index + 1}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-flora-ink sm:text-base">
                                      {product.title}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2 text-xs text-flora-muted sm:gap-4 sm:text-sm">
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
                                <div className="flex-shrink-0 text-right">
                                  <p className="text-sm font-bold text-flora-ink sm:text-lg">
                                    {productAnalytics.orders_count} orders
                                  </p>
                                  <p className="text-xs text-flora-muted sm:text-sm">
                                    ₦{productAnalytics.revenue.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        : getFilteredAnalytics()
                            .slice(0, 10)
                            .map((productAnalytics, index) => {
                              const product = products.find(
                                (p) => p.id === productAnalytics.product_id
                              );
                              return (
                                <div
                                  key={productAnalytics.product_id}
                                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-flora-ink/10 p-3 transition hover:bg-flora-chip/50 sm:p-4"
                                  onClick={() =>
                                    product &&
                                    setSelectedProductAnalytics({
                                      product,
                                      analytics: productAnalytics,
                                    })
                                  }
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-flora-tagBg text-xs font-bold text-flora-tagText sm:h-8 sm:w-8 sm:text-sm">
                                      {index + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-flora-ink sm:text-base">
                                        {product?.title}
                                      </p>
                                      <div className="mt-1 flex items-center gap-2 text-xs text-flora-muted sm:gap-4 sm:text-sm">
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
                                  <div className="flex-shrink-0 text-right">
                                    <p className="text-sm font-bold text-flora-ink sm:text-lg">
                                      {productAnalytics.orders_count} orders
                                    </p>
                                    <p className="text-xs text-flora-muted sm:text-sm">
                                      ₦{productAnalytics.revenue.toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </PullToRefresh>

      {/* Detailed Analytics Modal */}
      {selectedProductAnalytics &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-flora-ink/60 p-4 backdrop-blur-sm"
            onClick={() => setSelectedProductAnalytics(null)}
          >
            <div
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-flora-card rounded-3xl shadow-floating"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-flora-card border-b border-flora-ink/10 p-4 flex items-center justify-between rounded-t-3xl">
                <h2 className="text-lg sm:text-xl font-semibold text-flora-ink truncate pr-4">
                  {selectedProductAnalytics.product.title} - Analytics
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedProductAnalytics(null)}
                  aria-label="Close"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-flora-ink transition hover:bg-flora-chip"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {/* Overview Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-flora-chip p-3 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-flora-ink" />
                      <span className="text-xs font-medium text-flora-ink">Views</span>
                    </div>
                    <div className="text-xl font-bold text-flora-ink">
                      {selectedProductAnalytics.analytics.views}
                    </div>
                  </div>
                  <div className="bg-flora-chip p-3 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-xs font-medium text-flora-ink">Favorites</span>
                    </div>
                    <div className="text-xl font-bold text-flora-ink">
                      {selectedProductAnalytics.analytics.favorites_count}
                    </div>
                  </div>
                  <div className="bg-flora-chip p-3 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="h-4 w-4 text-flora-leaf" />
                      <span className="text-xs font-medium text-flora-ink">Cart Adds</span>
                    </div>
                    <div className="text-xl font-bold text-flora-ink">
                      {selectedProductAnalytics.analytics.cart_additions}
                    </div>
                  </div>
                  <div className="bg-flora-chip p-3 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-flora-tagText" />
                      <span className="text-xs font-medium text-flora-ink">Orders</span>
                    </div>
                    <div className="text-xl font-bold text-flora-ink">
                      {selectedProductAnalytics.analytics.orders_count}
                    </div>
                  </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Engagement Chart */}
                  <div className="bg-flora-chip p-4 rounded-2xl">
                    <h3 className="font-semibold mb-4 text-sm text-flora-ink">
                      Engagement Metrics
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-flora-muted">Views</span>
                        <div className="flex items-center gap-2 flex-1 max-w-24 sm:max-w-32">
                          <div className="flex-1 h-2 bg-white rounded">
                            <div
                              className="h-full bg-flora-ink rounded"
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
                          <span className="text-xs font-medium text-flora-ink">
                            {selectedProductAnalytics.analytics.views}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-flora-muted">Favorites</span>
                        <div className="flex items-center gap-2 flex-1 max-w-24 sm:max-w-32">
                          <div className="flex-1 h-2 bg-white rounded">
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
                          <span className="text-xs font-medium text-flora-ink">
                            {selectedProductAnalytics.analytics.favorites_count}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-flora-muted">Cart Adds</span>
                        <div className="flex items-center gap-2 flex-1 max-w-24 sm:max-w-32">
                          <div className="flex-1 h-2 bg-white rounded">
                            <div
                              className="h-full bg-flora-leaf rounded"
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
                          <span className="text-xs font-medium text-flora-ink">
                            {selectedProductAnalytics.analytics.cart_additions}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Revenue Chart */}
                  <div className="bg-flora-chip p-4 rounded-2xl">
                    <h3 className="font-semibold mb-4 text-sm text-flora-ink">
                      Revenue & Orders
                    </h3>
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-xl sm:text-2xl font-bold text-flora-leaf">
                          ₦
                          {selectedProductAnalytics.analytics.revenue.toLocaleString()}
                        </div>
                        <div className="text-xs text-flora-muted">
                          Total Revenue
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg sm:text-xl font-bold text-flora-ink">
                          {selectedProductAnalytics.analytics.orders_count}
                        </div>
                        <div className="text-xs text-flora-muted">
                          Total Orders
                        </div>
                      </div>
                      {selectedProductAnalytics.analytics.orders_count > 0 && (
                        <div className="text-center">
                          <div className="text-base sm:text-lg font-semibold text-flora-ink">
                            ₦
                            {Math.round(
                              selectedProductAnalytics.analytics.revenue /
                                selectedProductAnalytics.analytics.orders_count
                            ).toLocaleString()}
                          </div>
                          <div className="text-xs text-flora-muted">
                            Average Order Value
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="bg-flora-chip p-4 rounded-2xl">
                  <h3 className="font-semibold mb-4 text-sm text-flora-ink">
                    Product Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-flora-ink">
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
                      <span
                        className={cn(
                          "ml-2 rounded-full px-2 py-0.5 text-xs font-medium",
                          selectedProductAnalytics.product.is_active
                            ? "bg-flora-tagBg text-flora-tagText"
                            : "bg-flora-chip text-flora-muted"
                        )}
                      >
                        {selectedProductAnalytics.product.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
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
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-flora-card rounded-3xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-flora-card border-b border-flora-ink/10 p-4 rounded-t-3xl">
                <h2 className="text-lg font-semibold text-flora-ink">Edit Product</h2>
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
                      <p className="text-xs text-flora-muted mb-2">Current Images:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {editingProduct.images.map((imageUrl, index) => (
                          <div key={index} className="relative">
                            <img
                              src={imageUrl}
                              alt={`Product ${index + 1}`}
                              className="w-full h-20 object-cover rounded-xl"
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
                      <p className="text-xs text-flora-muted mb-2">New Images:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {newImages.map((file, index) => (
                          <div key={index} className="relative">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`New ${index + 1}`}
                              className="w-full h-20 object-cover rounded-xl"
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
                        className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-flora-ink/20 rounded-2xl cursor-pointer hover:bg-flora-chip/50 transition-colors"
                      >
                        <Upload className="h-6 w-6 text-flora-muted mb-1" />
                        <span className="text-xs text-flora-muted">
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
