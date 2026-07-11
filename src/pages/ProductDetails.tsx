import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/contexts/ProfileContext";
import { useCartCount } from "@/contexts/CartCountContext";
import { BUSINESS_RULES, IGBINEDION_UNIVERSITY } from "@/lib/constants";
import {
  Share2,
  MessageCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  Check,
  Flag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  HeartIcon,
  StarIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  UserIcon,
} from "@/components/ui/heroicons";
import { IconButton } from "@/components/ui/icon-button";
import { StatBadge } from "@/components/ui/stat-badge";
import { Stepper } from "@/components/ui/stepper";
import { Tag } from "@/components/ui/tag";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/marketplace/ProductCard";

import { ProductReviews } from "@/components/reviews/ProductReviews";
import { ProductSEO } from "@/components/common/ProductSEO";
import { SizeSelector } from "@/components/marketplace/SizeSelector";

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
  available_sizes?: string[];
  created_at: string;
  seller?: {
    full_name: string;
    avatar_url?: string;
    is_verified: boolean;
    rating: number;
    total_reviews: number;
    campus?: string;
    phone?: string;
    email?: string;
  };
}

const toCardProduct = (product: Product): ProductCardProduct => ({
  id: product.id,
  title: product.title,
  price: product.price,
  stock_quantity: product.stock_quantity,
  images: product.images || [],
  sellerName: product.seller?.full_name || "Unknown seller",
});

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { updateOptimistically: updateCartCountOptimistically } = useCartCount();
  const isIgbinedionStudent =
    profile?.university_name === IGBINEDION_UNIVERSITY;
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [similarCart, setSimilarCart] = useState<Set<string>>(new Set());
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoSliding, setIsAutoSliding] = useState(true);
  const [loading, setLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isInCart, setIsInCart] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    if (product) {
      fetchSimilarProducts();
      checkFavoriteStatus();
      checkCartStatus();
    }
  }, [product, user]);

  // Auto-slide functionality
  useEffect(() => {
    if (
      !product ||
      !product.images ||
      product.images.length <= 1 ||
      !isAutoSliding
    )
      return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [product, isAutoSliding]);

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
    setIsAutoSliding(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (
      isLeftSwipe &&
      product &&
      product.images &&
      currentImageIndex < product.images.length - 1
    ) {
      setCurrentImageIndex((prev) => prev + 1);
    }
    if (isRightSwipe && currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
    setTimeout(() => setIsAutoSliding(true), 5000);
  };

  const fetchProduct = async () => {
    try {
      const { data: productData, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      // Fetch seller info separately
      const { data: sellerData } = await supabase
        .from("profiles")
        .select(
          "full_name, avatar_url, is_verified, rating, total_reviews, campus, phone_number, email",
        )
        .eq("user_id", productData.seller_id)
        .single();

      const data = {
        ...productData,
        seller: sellerData,
      };

      // Product loaded successfully
      setProduct(data);

      // Track product view
      if (data?.id) {
        await supabase.rpc("track_product_view", { p_product_id: data.id });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchSimilarProducts = async () => {
    if (!product) return;

    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          profiles!products_seller_id_fkey (
            full_name,
            avatar_url,
            is_verified,
            rating,
            total_reviews,
            campus
          )
        `,
        )
        .eq("category", product.category)
        .neq("id", product.id)
        .limit(4);

      if (error) throw error;

      // Transform data to match expected structure
      const transformedData = (data || []).map((item) => ({
        ...item,
        seller: item.profiles,
      }));

      setSimilarProducts(transformedData);

      if (user && transformedData.length > 0) {
        const { data: cartData } = await supabase
          .from("cart")
          .select("product_id")
          .eq("user_id", user.id)
          .in(
            "product_id",
            transformedData.map((item) => item.id),
          );
        setSimilarCart(new Set((cartData || []).map((c) => c.product_id)));
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setSimilarLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (isInCart) return; // Prevent action if already in cart

    if (!user) {
      // Store current product URL for redirect after login
      localStorage.setItem("redirect_after_auth", window.location.pathname);
      navigate("/auth");
      return;
    }

    if (!product) return;

    try {
      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from("cart")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (existingItem) {
        // Check if adding more would exceed stock
        if (existingItem.quantity + quantity > product.stock_quantity) {
          toast({
            title: "Stock Limit Exceeded",
            description: `Only ${
              product.stock_quantity - existingItem.quantity
            } more items available`,
            variant: "destructive",
          });
          return;
        }

        // Optimistic update
        updateCartCountOptimistically(quantity);
        setIsInCart(true);
        toast({
          title: "Added to Cart",
          description: `${quantity} item(s) added to your cart`,
        });

        // Update quantity if item exists
        const { error } = await supabase
          .from("cart")
          .update({
            quantity: existingItem.quantity + quantity,
            selected_size: selectedSize || existingItem.selected_size,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingItem.id);

        if (error) {
          // Revert optimistic update
          updateCartCountOptimistically(-quantity);
          setIsInCart(false);
          throw error;
        }
      } else {
        // Check if requested quantity exceeds stock
        if (quantity > product.stock_quantity) {
          toast({
            title: "Stock Limit Exceeded",
            description: `Only ${product.stock_quantity} items available`,
            variant: "destructive",
          });
          return;
        }

        // Optimistic update
        updateCartCountOptimistically(quantity);
        setIsInCart(true);
        toast({
          title: "Added to Cart",
          description: `${quantity} item(s) added to your cart`,
        });

        // Insert new item to cart
        const { error } = await supabase.from("cart").insert({
          user_id: user.id,
          product_id: product.id,
          quantity: quantity,
          selected_size: selectedSize || null,
        });

        if (error) {
          // Revert optimistic update
          updateCartCountOptimistically(-quantity);
          setIsInCart(false);
          throw error;
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const handleToggleSimilarCart = async (productId: string) => {
    if (!user) {
      localStorage.setItem("redirect_after_auth", window.location.pathname);
      navigate("/auth");
      return;
    }

    const alreadyInCart = similarCart.has(productId);

    try {
      if (alreadyInCart) {
        setSimilarCart((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
        updateCartCountOptimistically(-1);
        const { error } = await supabase
          .from("cart")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
        toast({ title: "Removed from cart" });
      } else {
        setSimilarCart((prev) => new Set(prev).add(productId));
        updateCartCountOptimistically(1);
        const { error } = await supabase
          .from("cart")
          .insert({ user_id: user.id, product_id: productId, quantity: 1 });
        if (error) throw error;
        toast({ title: "Added to cart" });
      }
    } catch (error) {
      // Revert optimistic update on error
      setSimilarCart((prev) => {
        const next = new Set(prev);
        if (alreadyInCart) {
          next.add(productId);
        } else {
          next.delete(productId);
        }
        return next;
      });
      toast({
        title: "Error",
        description: "Failed to update cart",
        variant: "destructive",
      });
    }
  };

  const handleStartChat = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!product) return;

    try {
      // Use the same function as ProductCard to find or create consolidated conversation
      const { data: conversationId, error } = await supabase.rpc(
        "find_or_create_conversation",
        {
          p_buyer_id: user.id,
          p_seller_id: product.seller_id,
          p_product_id: product.id,
        },
      );

      if (error) throw error;

      const draftMessage = `Hi! I'm interested in your ${
        product.title
      } listed for ₦${product.price.toLocaleString()}. Is it still available?`;
      navigate(
        `/messages?conversation=${conversationId}&draft=${encodeURIComponent(
          draftMessage,
        )}`,
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!product) return;

    const url = window.location.href;
    const title = `${product.title} - ₦${product.price.toLocaleString()}`;
    const text = `Check out this ${product.title} on UniMarket! Only ₦${product.price.toLocaleString()}`;

    // Try Web Share API first
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "Product link copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Share Link",
        description: url,
      });
    }
  };

  const checkFavoriteStatus = async () => {
    if (!product || !user) return;

    try {
      const { data } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .single();

      setIsFavorited(!!data);
    } catch (error) {
      // Not favorited or error - default to false
      setIsFavorited(false);
    }
  };

  const checkCartStatus = async () => {
    if (!product || !user) return;

    try {
      const { data } = await supabase
        .from("cart")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .single();

      setIsInCart(!!data);
    } catch (error) {
      // Not in cart or error - default to false
      setIsInCart(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!product) return;

    setFavoriteLoading(true);
    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", product.id);

        if (error) throw error;

        setIsFavorited(false);
        toast({
          title: "Removed from Favorites",
          description: "Product removed from your favorites",
        });
      } else {
        // Add to favorites
        const { error } = await supabase.from("favorites").insert({
          user_id: user.id,
          product_id: product.id,
        });

        if (error) throw error;

        setIsFavorited(true);
        toast({
          title: "Added to Favorites",
          description: "Product added to your favorites",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleReportIssue = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!product || !reportReason.trim() || !reportDescription.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create product report
      const { error: reportError } = await supabase
        .from("product_reports")
        .insert({
          product_id: product.id,
          reported_by: user.id,
          reason: reportReason,
          description: reportDescription,
          status: "pending",
        });

      if (reportError) throw reportError;

      // Send notification to seller
      await supabase.from("notifications").insert({
        user_id: product.seller_id,
        title: "Product Issue Reported",
        message: `A user has reported an issue with your product "${product.title}". Reason: ${reportReason}`,
        type: "warning",
      });

      // Notify admins
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins) {
        for (const admin of admins) {
          await supabase.from("notifications").insert({
            user_id: admin.user_id,
            title: "Product Report Received",
            message: `Product "${product.title}" has been reported for: ${reportReason}`,
            type: "info",
          });
        }
      }

      toast({
        title: "Report Submitted",
        description:
          "Your report has been submitted and the seller has been notified.",
      });

      setReportDialogOpen(false);
      setReportReason("");
      setReportDescription("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-6xl px-3 pt-6 sm:px-6 lg:grid lg:grid-cols-2 lg:gap-12">
          <div className="aspect-square animate-pulse rounded-4xl bg-white/40" />
          <div className="mt-6 animate-pulse space-y-4 rounded-4xl bg-white/70 p-6 shadow-card lg:mt-0">
            <div className="h-8 w-2/3 rounded bg-flora-chip" />
            <div className="h-4 rounded bg-flora-chip" />
            <div className="h-6 w-1/3 rounded bg-flora-chip" />
          </div>
        </main>
      </div>
    );
  }

  if (!product) return null;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : ["/placeholder.svg"];

  const goPrevImage = () => {
    setCurrentImageIndex(
      currentImageIndex === 0 ? images.length - 1 : currentImageIndex - 1,
    );
    setIsAutoSliding(false);
    setTimeout(() => setIsAutoSliding(true), 5000);
  };

  const goNextImage = () => {
    setCurrentImageIndex(
      currentImageIndex === images.length - 1 ? 0 : currentImageIndex + 1,
    );
    setIsAutoSliding(false);
    setTimeout(() => setIsAutoSliding(true), 5000);
  };

  const maxQuantity = Math.min(10, product.stock_quantity);

  // Shared between the mobile fixed-background layer and the desktop card —
  // same controls, two different containers.
  const galleryOverlay = (
    <>
      <img
        src={images[currentImageIndex]}
        alt={product.title}
        className="h-full w-full object-cover transition-all duration-300"
        onError={(e) => {
          e.currentTarget.src = "/placeholder.svg";
        }}
      />

      {/* On mobile this now sits at the very top of the screen (no site
          header above it anymore), so its top offset accounts for the
          notch/status-bar safe area instead of the fixed top-4 that was
          fine when a header used to occupy that space. Desktop still has
          the header, so it reverts to a plain top-4 there. */}
      <IconButton
        icon={ChevronLeft}
        label="Go back"
        tone="ghost"
        className="absolute left-4 top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] z-20 sm:top-4"
        onClick={() => navigate(-1)}
      />

      {images.length > 1 && (
        <>
          <IconButton
            icon={ChevronLeft}
            label="Previous image"
            size="sm"
            tone="light"
            className="absolute left-3 top-1/2 -translate-y-1/2"
            onClick={goPrevImage}
          />
          <IconButton
            icon={ChevronRight}
            label="Next image"
            size="sm"
            tone="light"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={goNextImage}
          />

          <div className="absolute bottom-3 right-3 hidden rounded-lg bg-flora-ink/70 px-2 py-1 text-xs font-medium text-white sm:block">
            {currentImageIndex + 1} / {images.length}
          </div>

          <div className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 gap-1.5 sm:flex">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`View image ${index + 1} of ${images.length}`}
                aria-current={index === currentImageIndex}
                onClick={() => {
                  setCurrentImageIndex(index);
                  setIsAutoSliding(false);
                  setTimeout(() => setIsAutoSliding(true), 5000);
                }}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentImageIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}

      <StatBadge
        icon={StarIcon}
        label="Seller Rating"
        progress={((product.seller?.rating || 0) / 5) * 100}
        className="right-4 top-4"
      />
      <StatBadge
        icon={ShieldCheckIcon}
        label="Escrow Protected"
        progress={100}
        className="left-4 top-[38%]"
      />
    </>
  );

  const galleryTouchHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onMouseEnter: () => setIsAutoSliding(false),
    onMouseLeave: () => setIsAutoSliding(true),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <ProductSEO product={product} />

      {/* Mobile: image is truly fixed to the viewport (not sticky — it never
          scrolls away), filling the screen behind everything. Starts below
          the app's own fixed navbar (h-16, z-40) so the back button and
          stat badges aren't hidden underneath it. This spacer sets how much
          of the initial viewport is image vs. info sheet — taller spacer
          means more image and less of the sheet's content (description,
          tags, stepper) visible before the user scrolls or drags it up. */}
      <div
        className="fixed inset-x-0 bottom-0 top-0 z-0 overflow-hidden bg-white/40 sm:hidden"
        {...galleryTouchHandlers}>
        {galleryOverlay}
      </div>
      <div className="h-[calc(58dvh+15px)] sm:hidden" aria-hidden="true" />

      <main className="relative z-10 mx-auto max-w-6xl pb-10 sm:px-6 sm:pt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12 lg:px-6 lg:pt-6">
        {/* Tablet/desktop: image is a normal card in the flow (sticky only
            once the two-column grid kicks in at lg:) — the mobile fixed
            treatment above is hidden here. */}
        <div className="relative hidden sm:block lg:sticky lg:top-24">
          <div
            className="relative aspect-[4/3] w-full overflow-hidden rounded-4xl bg-white/40 lg:aspect-square"
            {...galleryTouchHandlers}>
            {galleryOverlay}
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-current={index === currentImageIndex}
                  onClick={() => {
                    setCurrentImageIndex(index);
                    setIsAutoSliding(false);
                    setTimeout(() => setIsAutoSliding(true), 5000);
                  }}
                  className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition sm:h-20 sm:w-20 ${
                    index === currentImageIndex
                      ? "border-flora-leaf"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}>
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info panel — a solid white sheet that peeks up from the bottom of
            the fixed image on mobile and slides over it as the page scrolls.
            Reverts to a normal card in the two-column desktop layout. Flows
            straight into the seller and reviews sections below (no card
            boundary between them) so the whole thing reads as one surface. */}
        <section className="relative rounded-t-4xl bg-flora-bgFrom px-6 pb-6 pt-3 shadow-floating sm:rounded-4xl sm:bg-white/70 sm:px-8 sm:py-8 sm:shadow-card sm:backdrop-blur-sm">
          <div
            className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-flora-ink/15 sm:hidden"
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate(`/seller/${product.seller_id}`)}
              className="min-w-0">
              <Tag
                variant="outline"
                icon={product.seller?.is_verified ? CheckBadgeIcon : undefined}
                className="max-w-full truncate">
                <span className="truncate">
                  by {product.seller?.full_name || "Unknown seller"}
                </span>
              </Tag>
            </button>
            <div className="flex flex-shrink-0 items-center gap-2">
              <Dialog
                open={reportDialogOpen}
                onOpenChange={setReportDialogOpen}>
                <DialogTrigger asChild>
                  <IconButton
                    icon={Flag}
                    label="Report an issue with this product"
                    tone="light"
                  />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Report Issue with Product</DialogTitle>
                    <DialogDescription>
                      Report any issues with this product. The seller will be
                      notified.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reason">Reason for Report</Label>
                      <Select
                        value={reportReason}
                        onValueChange={setReportReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="misleading_description">
                            Misleading Description
                          </SelectItem>
                          <SelectItem value="wrong_price">
                            Wrong Price
                          </SelectItem>
                          <SelectItem value="fake_product">
                            Fake/Counterfeit Product
                          </SelectItem>
                          <SelectItem value="inappropriate_content">
                            Inappropriate Content
                          </SelectItem>
                          <SelectItem value="spam">Spam</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Please provide more details about the issue..."
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        rows={4}
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setReportDialogOpen(false)}
                          className="rounded-full border border-flora-ink/10 px-4 py-2 text-sm font-medium text-flora-ink transition hover:bg-flora-chip">
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleReportIssue}
                          className="rounded-full bg-flora-ink px-4 py-2 text-sm font-medium text-white transition hover:brightness-110">
                          Submit Report
                        </button>
                      </div>
                      <div className="text-center">
                        <p className="mb-2 text-xs text-flora-muted">
                          Need immediate help?
                        </p>
                        <a
                          href="https://wa.me/2349133054018"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded-full border border-green-600 px-4 py-2 text-sm font-medium text-green-600 transition hover:bg-green-50">
                          Chat on WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <IconButton
                icon={copied ? Check : Share2}
                label="Share this product"
                tone="light"
                onClick={handleShare}
              />

              <IconButton
                icon={HeartIcon}
                label={
                  isFavorited ? "Remove from favorites" : "Save to favorites"
                }
                tone="light"
                pressed={isFavorited}
                iconClassName={
                  isFavorited ? "fill-red-500 text-red-500" : undefined
                }
                onClick={handleToggleFavorite}
                className={
                  favoriteLoading ? "pointer-events-none opacity-60" : undefined
                }
              />
            </div>
          </div>

          {/* Name + price lead the sheet — the two things a buyer scans for
              first — sized to stay legible even in the initial mobile peek. */}
          <div className="mt-5 flex items-start justify-between gap-3">
            <h1 className="line-clamp-2 text-2xl font-semibold leading-tight text-flora-ink sm:text-3xl">
              {product.title}
            </h1>
            <p className="flex-shrink-0 text-xl font-semibold text-flora-ink sm:text-2xl">
              ₦{product.price.toLocaleString()}
            </p>
          </div>

          {product.description && (
            <div className="mt-3">
              <p
                className={`text-sm leading-relaxed text-flora-muted ${
                  !isDescriptionExpanded && product.description.length > 150
                    ? "line-clamp-3"
                    : ""
                }`}>
                {product.description}
              </p>
              {product.description.length > 150 && (
                <button
                  type="button"
                  onClick={() =>
                    setIsDescriptionExpanded(!isDescriptionExpanded)
                  }
                  className="mt-2 flex items-center gap-1 text-sm font-medium text-flora-leaf transition hover:brightness-90">
                  {isDescriptionExpanded ? "Show less" : "Show more"}
                  {isDescriptionExpanded ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2.5">
            <Tag>{product.category}</Tag>
            <Tag>{product.condition}</Tag>
            <Tag>{product.stock_quantity} in stock</Tag>
          </div>

          {product.available_sizes && product.available_sizes.length > 0 && (
            <div className="mt-5">
              <SizeSelector
                availableSizes={product.available_sizes}
                selectedSize={selectedSize}
                onSizeSelect={setSelectedSize}
                required
              />
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <span className="text-sm font-medium text-flora-ink">Quantity</span>
            <Stepper
              quantity={quantity}
              itemLabel={product.title}
              onIncrease={() =>
                setQuantity((q) => Math.min(q + 1, maxQuantity))
              }
              onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
            />
            <span className="text-xs text-flora-muted">
              (max {maxQuantity})
            </span>
          </div>

          {isIgbinedionStudent && (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-flora-chip px-3 py-2.5 text-xs text-flora-muted">
              <Package className="h-4 w-4 flex-shrink-0" aria-hidden="true" />₦
              {BUSINESS_RULES.delivery.flatRate.toLocaleString()} delivery fee
              (paid to the driver, not this app) anywhere around Igbinedion
              University — or choose pickup at checkout
            </div>
          )}

          {/* Desktop keeps the button inline at the end of the purchase
              card. Mobile hides this copy in favor of the sticky bar below,
              so the primary action stays reachable through the whole
              scroll — matching how Cart/Product Detail already replace the
              bottom tab bar with a full-width action instead of competing
              for thumb space. */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isInCart}
            className="mt-6 hidden w-full items-center justify-center gap-2 rounded-full bg-flora-ink py-4 text-base font-medium text-white transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 sm:flex lg:max-w-sm">
            {isInCart ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                In Cart
              </>
            ) : (
              "Add to Cart"
            )}
          </button>

          <div className="h-24 sm:hidden" aria-hidden="true" />
        </section>

        {/* No wrapping bar — the button floats alone directly over whatever
            scrolls beneath it, so it needs its own shadow (rather than a
            bar background) to stay visually grounded against varying
            content. */}
        <div
          className="fixed inset-x-0 bottom-0 z-30 px-4 sm:hidden"
          style={{ paddingTop: 12, paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isInCart}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-flora-ink py-4 text-base font-medium text-white shadow-floating transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70">
            {isInCart ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                In Cart
              </>
            ) : (
              `Add to Cart · ₦${(product.price * quantity).toLocaleString()}`
            )}
          </button>
        </div>

        {/* Seller info — continues the same white surface as the info panel
            on mobile (just a divider, no card gap); a distinct card again
            from sm: up, matching the rest of the desktop layout. */}
        <div className="border-t border-flora-ink/10 bg-flora-bgFrom px-6 py-6 sm:mt-6 sm:rounded-4xl sm:border-t-0 sm:bg-white/70 sm:px-8 sm:py-8 sm:shadow-card sm:backdrop-blur-sm lg:col-span-2">
          <h3 className="mb-5 flex items-center gap-2 text-lg font-semibold text-flora-ink">
            <ShieldCheckIcon className="h-5 w-5 text-flora-leaf" />
            Seller Information
          </h3>

          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate(`/seller/${product.seller_id}`)}
              className="relative flex-shrink-0"
              aria-label={`View ${product.seller?.full_name || "seller"}'s profile`}>
              {product.seller?.avatar_url ? (
                <img
                  src={product.seller.avatar_url}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover sm:h-16 sm:w-16"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-flora-leaf text-base font-medium text-white sm:h-16 sm:w-16 sm:text-lg">
                  {product.seller?.full_name
                    ? getInitials(product.seller.full_name)
                    : "S"}
                </div>
              )}
              {product.seller?.is_verified && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 sm:h-6 sm:w-6">
                  <CheckBadgeIcon className="h-3.5 w-3.5 text-white" />
                </span>
              )}
            </button>

            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => navigate(`/seller/${product.seller_id}`)}
                className="truncate text-base font-semibold text-flora-ink underline-offset-2 transition hover:text-flora-leaf hover:underline sm:text-lg">
                {product.seller?.full_name}
              </button>
              <p className="mt-0.5 text-xs text-flora-muted">
                Selling since {new Date(product.created_at).getFullYear()}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {product.seller?.is_verified && (
                  <Tag variant="dark" icon={CheckBadgeIcon}>
                    Verified
                  </Tag>
                )}
                <Tag icon={StarIcon}>
                  {product.seller?.rating?.toFixed(1) || "0.0"} ·{" "}
                  {product.seller?.total_reviews || 0} reviews
                </Tag>
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => navigate(`/seller/${product.seller_id}`)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-flora-ink/15 py-3 text-sm font-medium text-flora-ink transition hover:bg-flora-chip">
              <UserIcon className="h-4 w-4" aria-hidden="true" />
              View Profile
            </button>
            <button
              type="button"
              onClick={handleStartChat}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-flora-leaf py-3 text-sm font-medium text-white transition hover:brightness-105">
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              Chat with Seller
            </button>
          </div>
        </div>

        {/* Reviews — same continuous white surface on mobile as the panels
            above it; ProductReviews' own card returns from sm: up. */}
        <div className="border-t border-flora-ink/10 bg-flora-bgFrom sm:mt-8 sm:border-t-0 sm:bg-transparent lg:col-span-2">
          <ProductReviews
            productId={product.id}
            sellerId={product.seller_id}
            className="sm:rounded-4xl sm:border sm:border-flora-ink/10 sm:bg-white/70 sm:shadow-card sm:backdrop-blur-sm"
          />
        </div>

        {/* Similar products — same continuous white surface on mobile as
            everything above it; its own white card again from sm: up. */}
        {!similarLoading && similarProducts.length > 0 && (
          <section className="border-t border-flora-ink/10 bg-flora-bgFrom px-6 py-6 sm:mt-10 sm:rounded-4xl sm:border-t-0 sm:bg-white/70 sm:px-8 sm:py-8 sm:shadow-card sm:backdrop-blur-sm lg:col-span-2">
            <h2 className="text-xl font-semibold text-flora-ink">
              Similar Products
            </h2>
            <p className="mt-1 text-sm text-flora-muted">
              You might also like these items in {product.category}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
              {similarProducts.map((similarProduct) => (
                <ProductCard
                  key={similarProduct.id}
                  product={toCardProduct(similarProduct)}
                  isInCart={similarCart.has(similarProduct.id)}
                  onSelect={(productId) => navigate(`/product/${productId}`)}
                  onToggleCart={handleToggleSimilarCart}
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default ProductDetails;
