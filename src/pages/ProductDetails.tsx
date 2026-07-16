import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { findOrCreateConversation } from "@/utils/conversationUtils";
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
  X,
  Copy,
  Twitter,
  Facebook,
  Instagram,
  Send,
} from "lucide-react";
import {
  HeartIcon,
  StarIcon,
  ShieldCheckIcon,
  CheckBadgeIcon,
  UserIcon,
  TikTokIcon,
} from "@/components/ui/heroicons";
import { IconButton } from "@/components/ui/icon-button";
import { StatBadge } from "@/components/ui/stat-badge";
import { Stepper } from "@/components/ui/stepper";
import { Tag } from "@/components/ui/tag";
import ProductCard, {
  type ProductCardProduct,
} from "@/components/marketplace/ProductCard";
import {
  generateShareableUrl,
  generateWhatsAppShareUrl,
  generateTwitterShareUrl,
  generateFacebookShareUrl,
} from "@/utils/shareUtils";

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

// A fixed, short set of mutually-exclusive reasons — a tappable list reads
// faster than a dropdown here (every option visible at once, no extra tap
// to open it) and matches the radio-list treatment SizeSelector already
// uses for a similarly small option set elsewhere in this file.
const REPORT_REASONS = [
  { value: "misleading_description", label: "Misleading Description" },
  { value: "wrong_price", label: "Wrong Price" },
  { value: "fake_product", label: "Fake/Counterfeit Product" },
  { value: "inappropriate_content", label: "Inappropriate Content" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
] as const;

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
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [copied, setCopied] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
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
      // Consolidated (bidirectional, product_id nulled out) so this never
      // creates a duplicate of an existing conversation with this seller.
      const conversationId = await findOrCreateConversation(
        user.id,
        product.seller_id,
        product.id,
      );

      if (!conversationId) throw new Error("Failed to start chat");

      const draftMessage = `Hi! I'm interested in your ${
        product.title
      } listed for ₦${product.price.toLocaleString()}. Is it still available?`;
      navigate(
        `/chat/${conversationId}?draft=${encodeURIComponent(draftMessage)}`,
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start chat",
        variant: "destructive",
      });
    }
  };

  // Explicit per-platform buttons in a dialog instead of going straight to
  // navigator.share: Web Share API isn't available on most desktop
  // browsers at all, which left desktop users with only the silent
  // clipboard fallback and no visible confirmation of what had actually
  // happened. This works the same everywhere and always shows the link.
  const handleCopyLink = async () => {
    if (!product) return;
    const url = generateShareableUrl(product.id);

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

  // Instagram and TikTok have no public web "share this link" intent the
  // way WhatsApp/Twitter/Facebook do (no https://instagram.com/sharer?...
  // equivalent exists) — both are fundamentally app-based, so the honest
  // move is copying the link and telling people where to paste it, not
  // linking to a URL that won't actually do anything useful.
  const handlePlatformCopyShare = async (platform: string, hint: string) => {
    if (!product) return;
    const url = generateShareableUrl(product.id);

    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: `Link copied for ${platform}`,
        description: hint,
      });
    } catch (error) {
      toast({ title: "Share Link", description: url });
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

  // Shared between mobile (full-width, plain block) and desktop (rounded
  // card) — same overlay, two differently-sized containers. Prev/next and
  // the dot indicator used to live here, overlaid on the photo itself;
  // they're their own control row now (see galleryControls) instead of
  // floating circular buttons on top of the image, which also frees the
  // whole image up to be a single tap target for the fullscreen viewer.
  const galleryOverlay = (
    <>
      <img
        src={images[currentImageIndex]}
        alt={product.title}
        role="button"
        tabIndex={0}
        aria-label="View image full screen"
        onClick={() => setIsFullscreenOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsFullscreenOpen(true);
          }
        }}
        className="h-full w-full cursor-zoom-in object-cover transition-all duration-300"
        onError={(e) => {
          e.currentTarget.src = "/placeholder.svg";
        }}
      />

      {/* Accounts for the notch/status-bar safe area on mobile, where this
          sits at the very top of the screen; desktop still has the site
          header above it, so it reverts to a plain top-4 there. */}
      <IconButton
        icon={ChevronLeft}
        label="Go back"
        tone="ghost"
        className="absolute left-4 top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] z-20 sm:top-4"
        onClick={() => navigate(-1)}
      />

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

  // One shared tile style for every option in the share sheet grid — same
  // footprint whether it's a real link (<a>, opens the platform) or a
  // button (Instagram/TikTok/Copy, which have no such link to open).
  const shareTileClass =
    "flex flex-col items-center gap-2 rounded-2xl border border-flora-ink/10 py-4 text-xs font-medium text-flora-ink transition hover:bg-flora-chip";

  // Below the image, not floating on top of it — plain chevrons (no
  // circular button background) either side of the dot indicator, shared
  // by mobile and desktop.
  const galleryControls = images.length > 1 && (
    <div className="mt-3 flex items-center justify-center gap-4">
      <button
        type="button"
        aria-label="Previous image"
        onClick={goPrevImage}
        className="flex h-8 w-8 items-center justify-center text-flora-ink transition hover:text-flora-leaf">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <div className="flex items-center gap-1.5">
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
            className={`h-1.5 rounded-full transition-all ${
              index === currentImageIndex
                ? "w-4 bg-flora-ink"
                : "w-1.5 bg-flora-ink/20"
            }`}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label="Next image"
        onClick={goNextImage}
        className="flex h-8 w-8 items-center justify-center text-flora-ink transition hover:text-flora-leaf">
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <ProductSEO product={product} />

      {/* Mobile: the photo just takes the full width of the screen, no
          colored frame or inset tile around it — normal document flow (not
          position:fixed, which is what caused the scroll jank before), so
          it's just its own section at the top, and everything else follows
          as its own section after it. */}
      <div
        className="relative aspect-square w-full overflow-hidden sm:hidden"
        {...galleryTouchHandlers}>
        {galleryOverlay}
      </div>
      <div className="sm:hidden">{galleryControls}</div>

      {/* Full-screen viewer — opened by tapping the gallery image. Same
          prev/next + swipe handlers as the inline gallery, just over a
          dark backdrop with the photo shown uncropped (object-contain). */}
      {isFullscreenOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-flora-ink"
          onClick={() => setIsFullscreenOpen(false)}
          {...galleryTouchHandlers}>
          <IconButton
            icon={X}
            label="Close full screen view"
            tone="ghost"
            className="absolute right-4 top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] z-10"
            onClick={() => setIsFullscreenOpen(false)}
          />
          {images.length > 1 && (
            <div className="absolute top-[max(1rem,calc(env(safe-area-inset-top)+0.5rem))] left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
              {currentImageIndex + 1} / {images.length}
            </div>
          )}
          <img
            src={images[currentImageIndex]}
            alt={product.title}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg";
            }}
          />
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrevImage();
                }}
                className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-white transition hover:text-flora-leaf">
                <ChevronLeft className="h-7 w-7" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  goNextImage();
                }}
                className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-white transition hover:text-flora-leaf">
                <ChevronRight className="h-7 w-7" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}

      <main className="relative z-10 mx-auto max-w-6xl pb-10 sm:px-6 sm:pt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-12 lg:px-6 lg:pt-6">
        {/* Tablet/desktop: image is a normal card in the grid flow — the
            mobile treatment above is hidden here. Deliberately NOT sticky:
            position:sticky only diverges from the grid's own natural
            items-start alignment once its `top` offset happens to exactly
            match the column's real resting position (header height + this
            main's own top padding) — get that even slightly wrong and the
            image snaps to the wrong spot the instant the page loads,
            visibly misaligned against the text column beside it from first
            paint. A plain, non-sticky column has no such threshold to get
            wrong: items-start on the grid guarantees both columns start at
            the same line, full stop. Losing "image stays in view while you
            scroll a long description" is the trade-off. */}
        <div className="relative hidden sm:block">
          <div
            className="relative aspect-[4/3] w-full overflow-hidden rounded-4xl bg-white/40 lg:aspect-square"
            {...galleryTouchHandlers}>
            {galleryOverlay}
          </div>
          {galleryControls}

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

        {/* Info panel — on mobile this is just the next plain section of
            the page (same background as everything else, no white sheet,
            no rounded-top overlap trick), flowing straight into the seller
            and reviews sections below it. Reverts to a normal white card
            in the two-column desktop layout, matching that column's own
            treatment. */}
        <section className="relative px-6 py-5 sm:rounded-4xl sm:bg-white/70 sm:px-8 sm:py-8 sm:shadow-card sm:backdrop-blur-sm">
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
                <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-flora-ink">
                      <Flag className="h-5 w-5 text-flora-leaf" aria-hidden="true" />
                      Report Issue with Product
                    </DialogTitle>
                    <DialogDescription className="text-flora-muted">
                      Report any issues with this product. The seller will be
                      notified.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-flora-ink">
                        Reason for Report
                      </Label>
                      <div
                        role="radiogroup"
                        aria-label="Reason for report"
                        className="space-y-2">
                        {REPORT_REASONS.map((reason) => {
                          const isSelected = reportReason === reason.value;
                          return (
                            <button
                              key={reason.value}
                              type="button"
                              role="radio"
                              aria-checked={isSelected}
                              onClick={() => setReportReason(reason.value)}
                              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
                                isSelected
                                  ? "border-flora-ink bg-flora-ink text-white"
                                  : "border-flora-ink/10 bg-white text-flora-ink hover:bg-flora-chip"
                              }`}>
                              {reason.label}
                              {isSelected && (
                                <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-flora-ink">
                        Description
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Please provide more details about the issue..."
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        rows={4}
                        className="rounded-2xl border border-flora-ink/10 bg-white text-sm text-flora-ink placeholder:text-flora-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-flora-leaf/30 focus-visible:border-flora-leaf"
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

              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogTrigger asChild>
                  <IconButton
                    icon={copied ? Check : Share2}
                    label="Share this product"
                    tone="light"
                  />
                </DialogTrigger>
                {/* overflow-x-hidden + min-w-0 on the direct content child
                    below are both load-bearing, not decorative: DialogContent
                    is a CSS grid (see ui/dialog.tsx), and grid items default
                    to min-width:auto — a long nowrap URL string (truncate
                    implies white-space:nowrap, so its min-content width is
                    its FULL width) was bubbling that width up through the
                    grid item and forcing the dialog wider than its own
                    max-w-md, which is what actually needed a sideways
                    scroll to see the rest of the sheet. */}
                <DialogContent className="overflow-x-hidden rounded-3xl sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-flora-ink">
                      <Share2 className="h-5 w-5 text-flora-leaf" aria-hidden="true" />
                      Share Product
                    </DialogTitle>
                    <DialogDescription className="text-flora-muted">
                      Share this listing with friends or on social media.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="min-w-0 space-y-4">
                    <p className="min-w-0 truncate rounded-2xl bg-flora-chip px-4 py-2.5 text-xs text-flora-muted">
                      {product ? generateShareableUrl(product.id) : ""}
                    </p>

                    {/* One even 3x2 grid instead of a special-cased copy-link
                        row plus a separate 3-across icon strip — Copy Link
                        is just another tile here, same as every platform,
                        so five platforms plus Copy sits as two full,
                        balanced rows instead of leaving an odd tile
                        stranded alone on its own row. */}
                    <div className="grid grid-cols-3 gap-3">
                      <a
                        href={product ? generateWhatsAppShareUrl(product) : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={shareTileClass}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-500 text-white">
                          <MessageCircle className="h-5 w-5" aria-hidden="true" />
                        </span>
                        WhatsApp
                      </a>
                      <a
                        href={product ? generateTwitterShareUrl(product) : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={shareTileClass}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-flora-ink text-white">
                          <Twitter className="h-5 w-5" aria-hidden="true" />
                        </span>
                        Twitter/X
                      </a>
                      <a
                        href={product ? generateFacebookShareUrl(product) : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={shareTileClass}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Facebook className="h-5 w-5" aria-hidden="true" />
                        </span>
                        Facebook
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          handlePlatformCopyShare(
                            "Instagram",
                            "Instagram doesn't support pre-filled links — paste it into your bio, a DM, or a Story."
                          )
                        }
                        className={shareTileClass}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 text-white">
                          <Instagram className="h-5 w-5" aria-hidden="true" />
                        </span>
                        Instagram
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handlePlatformCopyShare(
                            "TikTok",
                            "TikTok doesn't support pre-filled links — paste it into your bio or a video caption."
                          )
                        }
                        className={shareTileClass}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-flora-ink text-white">
                          <TikTokIcon className="h-5 w-5" />
                        </span>
                        TikTok
                      </button>
                      <button type="button" onClick={handleCopyLink} className={shareTileClass}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-flora-leaf text-white">
                          {copied ? (
                            <Check className="h-5 w-5" aria-hidden="true" />
                          ) : (
                            <Copy className="h-5 w-5" aria-hidden="true" />
                          )}
                        </span>
                        {copied ? "Copied" : "Copy Link"}
                      </button>
                    </div>

                    {typeof navigator !== "undefined" && !!navigator.share && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!product) return;
                          try {
                            await navigator.share({
                              title: `${product.title} - ₦${product.price.toLocaleString()}`,
                              text: `Check out this ${product.title} on UniMarket!`,
                              url: generateShareableUrl(product.id),
                            });
                          } catch (error) {
                            if (error instanceof Error && error.name === "AbortError") return;
                          }
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-flora-ink/10 py-3 text-sm font-medium text-flora-ink transition hover:bg-flora-chip">
                        <Send className="h-4 w-4" aria-hidden="true" />
                        More sharing options
                      </button>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

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

          {/* Name + price lead this section — the two things a buyer scans
              for first. */}
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

          {isIgbinedionStudent ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-flora-chip px-3 py-2.5 text-xs text-flora-ink/70">
              <Package className="h-4 w-4 flex-shrink-0" aria-hidden="true" />₦
              {BUSINESS_RULES.delivery.flatRate.toLocaleString()} delivery fee
              (paid to the driver, not this app) anywhere around Igbinedion
              University
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-flora-chip px-3 py-2.5 text-xs text-flora-ink/70">
              <Package className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              You'll pay the delivery fee to the driver on delivery
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

        {/* Seller info, reviews, and similar products all read as one
            continuous list on the page's own background from here on —
            no per-section card/shadow/background, just a thin divider and
            tight, consistent spacing between them, at every breakpoint
            (matching how Jumia/Amazon-style product pages present the
            "below the fold" details, rather than boxing each one). */}
        <div className="border-t border-flora-ink/10 px-6 py-5 sm:px-8 lg:col-span-2">
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

        {/* Reviews — same list treatment, no card. ProductReviews already
            has its own internal padding, so no className override needed
            beyond the divider this wrapper provides. */}
        <div className="border-t border-flora-ink/10 lg:col-span-2">
          <ProductReviews productId={product.id} sellerId={product.seller_id} />
        </div>

        {/* Similar products — same list treatment as the sections above. */}
        {!similarLoading && similarProducts.length > 0 && (
          <section className="border-t border-flora-ink/10 px-6 py-5 sm:px-8 lg:col-span-2">
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
