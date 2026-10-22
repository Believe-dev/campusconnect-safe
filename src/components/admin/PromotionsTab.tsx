import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadPromoImageToR2 } from "@/utils/r2Upload";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Zap, RefreshCw, Search, Plus, Package, X, Loader2, ImagePlus } from "lucide-react";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  duration_seconds: number;
  status: "draft" | "scheduled" | "live" | "disabled" | "ended";
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  promo_type: string;
  commission_enabled: boolean;
  banner_image_url: string | null;
}

interface PromoProductRow {
  id: string;
  promotion_id: string;
  product_id: string | null;
  stock_limit: number | null;
  claimed_count: number;
  custom_title: string | null;
  custom_price: number | null;
  custom_image_url: string | null;
  product: { title: string; price: number } | null;
}

interface PromoGrabRow {
  id: string;
  promotion_id: string;
  promo_product_id: string;
  user_id: string;
  quantity: number;
  status: "pending_fulfillment" | "shipped" | "delivered" | "cancelled";
  shipping_address: string | null;
  contact_phone: string | null;
  admin_notes: string | null;
  created_at: string;
  buyer: { full_name: string | null; email: string | null } | null;
  displayTitle: string;
}

interface ProductOption {
  id: string;
  title: string;
  price: number;
}

// What the admin is building up in the create/edit dialog - either a real
// catalog product or a one-off custom item, unified into one list so both
// kinds can be reordered/removed the same way. `id` is only present when
// this entry already exists as a promo_products row (editing) - keeping it
// lets admin_update_promotion update that row in place instead of
// delete+reinsert, which is what preserves claimed_count on unchanged items.
interface ProductListItem {
  id?: string;
  product_id?: string;
  custom_title?: string;
  custom_price?: number;
  custom_image_url?: string;
}

interface PromotionsTabProps {
  // Same lift pattern as OrdersTab/SellerSubscriptionManager - lets the nav
  // sidebar show a real pending-fulfillment badge without duplicating this
  // component's own fetch at the Admin.tsx level.
  onCountsChange?: (pendingFulfillment: number) => void;
}

const statusPillClasses = (status: string) => {
  if (status === "live") return "bg-flora-leaf/15 text-flora-leaf";
  if (status === "scheduled") return "bg-amber-100 text-amber-700";
  if (status === "disabled") return "bg-red-100 text-red-600";
  if (status === "ended") return "bg-flora-chip text-flora-ink";
  return "bg-flora-chip text-flora-muted"; // draft
};

const grabStatusPillClasses = (status: string) => {
  if (status === "delivered") return "bg-flora-leaf/15 text-flora-leaf";
  if (status === "shipped") return "bg-blue-100 text-blue-700";
  if (status === "cancelled") return "bg-red-100 text-red-600";
  return "bg-amber-100 text-amber-700"; // pending_fulfillment
};

const toLocalInputValue = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const ALL_STATUSES = [
  "draft",
  "scheduled",
  "live",
  "disabled",
  "ended",
] as const;

// A native <select>'s change event can't drive an AlertDialogTrigger
// directly (there's no click for Radix to intercept), so this holds the
// chosen target status in local state and renders its own controlled
// AlertDialog - same "confirm captures the specific value" shape as the
// custom-days extend flow elsewhere in the admin panel.
const PromotionStatusControl = ({
  currentStatus,
  promotionTitle,
  onConfirm,
}: {
  currentStatus: string;
  promotionTitle: string;
  onConfirm: (status: (typeof ALL_STATUSES)[number]) => void;
}) => {
  const [pendingStatus, setPendingStatus] = useState<
    (typeof ALL_STATUSES)[number] | null
  >(null);

  return (
    <>
      <select
        value=""
        onChange={(e) => {
          const value = e.target.value as (typeof ALL_STATUSES)[number];
          if (value) setPendingStatus(value);
          e.target.value = "";
        }}
        className="rounded-full border border-flora-ink/15 bg-white px-3 py-1.5 text-xs font-medium text-flora-ink"
      >
        <option value="" disabled>
          Change status...
        </option>
        {ALL_STATUSES.filter((s) => s !== currentStatus).map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <AlertDialog
        open={pendingStatus !== null}
        onOpenChange={(open) => !open && setPendingStatus(null)}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-flora-ink">
              Set "{promotionTitle}" to {pendingStatus}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-flora-muted">
              {pendingStatus === "live"
                ? "Buyers will be able to grab items immediately."
                : pendingStatus === "disabled"
                ? "Grabbing stops immediately, even if the scheduled end time hasn't passed yet."
                : pendingStatus === "ended"
                ? "This marks the dash as concluded."
                : pendingStatus === "scheduled"
                ? "It'll go live automatically at the scheduled start time, or you can start it early from here."
                : "It goes back to being a hidden draft."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStatus) onConfirm(pendingStatus);
                setPendingStatus(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const PromotionsTab = ({ onCountsChange }: PromotionsTabProps) => {
  const [activeView, setActiveView] = useState<"promotions" | "fulfillment">(
    "promotions"
  );
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [promoProducts, setPromoProducts] = useState<PromoProductRow[]>([]);
  const [grabs, setGrabs] = useState<PromoGrabRow[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoSearch, setPromoSearch] = useState("");
  const [grabSearch, setGrabSearch] = useState("");
  const [grabPromotionFilter, setGrabPromotionFilter] = useState("all");
  const [platformCommissionEnabled, setPlatformCommissionEnabled] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [productList, setProductList] = useState<ProductListItem[]>([]);
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [promoCommissionEnabled, setPromoCommissionEnabled] = useState(false);

  const [customTitle, setCustomTitle] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(null);
  const [customImageUploading, setCustomImageUploading] = useState(false);

  const fetchPromotions = async () => {
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setPromotions((data || []) as Promotion[]);
    } catch (error) {
      console.error("Error fetching promotions:", error);
      setPromotions([]);
    }
  };

  const fetchPromoProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("promo_products")
        .select(
          "*, product:products(title, price)"
        );
      if (error) throw error;
      setPromoProducts((data || []) as unknown as PromoProductRow[]);
    } catch (error) {
      console.error("Error fetching promo products:", error);
      setPromoProducts([]);
    }
  };

  const fetchGrabs = async () => {
    try {
      // promo_grabs.user_id references auth.users, not profiles directly (a
      // sibling table, not a parent), so profiles can't be embedded via a
      // PostgREST FK join here - same reason OrdersTab.tsx fetches buyer/
      // seller profiles as a separate query and merges client-side rather
      // than embedding.
      const { data: grabRows, error } = await supabase
        .from("promo_grabs")
        .select(
          "*, promo_product:promo_products(custom_title, product:products(title))"
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      type RawGrabRow = Omit<PromoGrabRow, "buyer" | "displayTitle"> & {
        promo_product: {
          custom_title: string | null;
          product: { title: string } | null;
        } | null;
      };
      const rows = (grabRows || []) as unknown as RawGrabRow[];

      const userIds = [...new Set(rows.map((g) => g.user_id))];
      const { data: buyerProfiles } = userIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", userIds)
        : { data: [] };

      const transformed = rows.map((g) => ({
        ...g,
        displayTitle:
          g.promo_product?.product?.title ||
          g.promo_product?.custom_title ||
          "Unknown item",
        buyer:
          buyerProfiles?.find((p) => p.user_id === g.user_id) || null,
      }));
      setGrabs(transformed as PromoGrabRow[]);
    } catch (error) {
      console.error("Error fetching promo grabs:", error);
      setGrabs([]);
    }
  };

  const fetchProductOptions = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, price")
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      setProductOptions((data || []) as ProductOption[]);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProductOptions([]);
    }
  };

  const fetchCommissionSetting = async () => {
    try {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("promotions_commission_enabled")
        .eq("id", 1)
        .single();
      if (error) throw error;
      setPlatformCommissionEnabled(!!data?.promotions_commission_enabled);
    } catch (error) {
      console.error("Error fetching commission setting:", error);
    }
  };

  const checkSuperAdmin = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) return;
      const { data, error } = await supabase.rpc("is_super_admin", {
        _user_id: userData.user.id,
      });
      if (error) throw error;
      setIsSuperAdmin(!!data);
    } catch (error) {
      console.error("Error checking super admin status:", error);
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchPromotions(),
      fetchPromoProducts(),
      fetchGrabs(),
      fetchProductOptions(),
      fetchCommissionSetting(),
      checkSuperAdmin(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    onCountsChange?.(
      grabs.filter((g) => g.status === "pending_fulfillment").length
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grabs]);

  const resetCustomProductForm = () => {
    setCustomTitle("");
    setCustomPrice("");
    setCustomImageUrl(null);
  };

  const openCreateDialog = () => {
    setEditingPromotion(null);
    setProductList([]);
    setProductSearch("");
    setBannerImageUrl(null);
    setPromoCommissionEnabled(false);
    resetCustomProductForm();
    setCreateOpen(true);
  };

  const openEditDialog = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setProductList(
      promoProducts
        .filter((pp) => pp.promotion_id === promotion.id)
        .map((pp) => ({
          id: pp.id,
          product_id: pp.product_id || undefined,
          custom_title: pp.custom_title || undefined,
          custom_price: pp.custom_price || undefined,
          custom_image_url: pp.custom_image_url || undefined,
        }))
    );
    setProductSearch("");
    setBannerImageUrl(promotion.banner_image_url);
    setPromoCommissionEnabled(promotion.commission_enabled);
    resetCustomProductForm();
    setCreateOpen(true);
  };

  const toggleCatalogProduct = (product: ProductOption, checked: boolean) => {
    setProductList((prev) =>
      checked
        ? [...prev, { product_id: product.id }]
        : prev.filter((item) => item.product_id !== product.id)
    );
  };

  const handleBannerUpload = async (file: File) => {
    setBannerUploading(true);
    try {
      const url = await uploadPromoImageToR2(file);
      setBannerImageUrl(url);
    } catch (error) {
      console.error("Error uploading banner:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload banner"
      );
    } finally {
      setBannerUploading(false);
    }
  };

  const handleCustomImageUpload = async (file: File) => {
    setCustomImageUploading(true);
    try {
      const url = await uploadPromoImageToR2(file);
      setCustomImageUrl(url);
    } catch (error) {
      console.error("Error uploading custom product image:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image"
      );
    } finally {
      setCustomImageUploading(false);
    }
  };

  const addCustomProduct = () => {
    if (!customTitle.trim() || !customImageUrl) {
      toast.error("A title and image are required for a custom item");
      return;
    }
    setProductList((prev) => [
      ...prev,
      {
        custom_title: customTitle.trim(),
        custom_price: customPrice ? parseFloat(customPrice) : undefined,
        custom_image_url: customImageUrl,
      },
    ]);
    resetCustomProductForm();
  };

  const removeProductListItem = (index: number) => {
    setProductList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSavePromotion = async (formData: FormData) => {
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const duration_seconds = parseInt(
      formData.get("duration_seconds") as string,
      10
    );
    const startsAtRaw = formData.get("starts_at") as string;
    const endsAtRaw = formData.get("ends_at") as string;
    const starts_at = startsAtRaw ? new Date(startsAtRaw).toISOString() : null;
    const ends_at = endsAtRaw ? new Date(endsAtRaw).toISOString() : null;

    const productsPayload = productList.map((item) => ({
      id: item.id || null,
      product_id: item.product_id || null,
      custom_title: item.custom_title || null,
      custom_price: item.custom_price ?? null,
      custom_image_url: item.custom_image_url || null,
    }));

    try {
      let promotionId = editingPromotion?.id;

      if (editingPromotion) {
        const { error } = await supabase.rpc("admin_update_promotion", {
          p_promotion_id: editingPromotion.id,
          p_title: title,
          p_description: description,
          p_duration_seconds: duration_seconds,
          p_starts_at: starts_at,
          p_ends_at: ends_at,
          p_products: productsPayload,
          p_promo_type: editingPromotion.promo_type,
          p_banner_image_url: bannerImageUrl,
        });
        if (error) throw error;
        toast.success("Promotion updated");
      } else {
        const { data, error } = await supabase.rpc("admin_create_promotion", {
          p_title: title,
          p_description: description,
          p_duration_seconds: duration_seconds,
          p_starts_at: starts_at,
          p_ends_at: ends_at,
          p_products: productsPayload,
          p_promo_type: "cart_dash",
          p_banner_image_url: bannerImageUrl,
        });
        if (error) throw error;
        promotionId = data as string;
        toast.success("Promotion created as a draft");
      }

      // Per-promotion commission is Super-Admin-only and lives behind its
      // own hard-gated function - only call it if this admin can actually
      // see the control, and only if it actually changed (avoids an
      // unnecessary permission-denied round-trip for non-super-admins who
      // never had the checkbox rendered at all).
      if (
        isSuperAdmin &&
        promotionId &&
        promoCommissionEnabled !== (editingPromotion?.commission_enabled ?? false)
      ) {
        const { error: commissionError } = await supabase.rpc(
          "update_promotion_commission",
          { p_promotion_id: promotionId, p_enabled: promoCommissionEnabled }
        );
        if (commissionError) {
          console.error("Error updating promo commission:", commissionError);
          toast.error("Promotion saved, but commission setting failed to update");
        }
      }

      setCreateOpen(false);
      fetchPromotions();
      fetchPromoProducts();
    } catch (error) {
      console.error("Error saving promotion:", error);
      toast.error("Failed to save promotion");
    }
  };

  const handleSetStatus = async (
    promotionId: string,
    status: Promotion["status"]
  ) => {
    try {
      const { error } = await supabase.rpc("admin_set_promotion_status", {
        p_promotion_id: promotionId,
        p_status: status,
      });
      if (error) throw error;
      toast.success(`Promotion set to ${status}`);
      fetchPromotions();
    } catch (error) {
      console.error("Error updating promotion status:", error);
      toast.error("Failed to update promotion status");
    }
  };

  const handleDeleteDraft = async (promotionId: string) => {
    try {
      const { error } = await supabase
        .from("promotions")
        .delete()
        .eq("id", promotionId);
      if (error) throw error;
      toast.success("Draft promotion deleted");
      fetchPromotions();
      fetchPromoProducts();
    } catch (error) {
      console.error("Error deleting promotion:", error);
      toast.error("Failed to delete promotion");
    }
  };

  const handleGrabStatus = async (
    grabId: string,
    status: PromoGrabRow["status"],
    reason?: string
  ) => {
    try {
      const { error } = await supabase.rpc("admin_update_promo_grab_status", {
        p_grab_id: grabId,
        p_status: status,
        p_reason: reason || null,
      });
      if (error) throw error;
      toast.success("Grab updated");
      fetchGrabs();
    } catch (error) {
      console.error("Error updating grab status:", error);
      toast.error("Failed to update grab");
    }
  };

  const handleTogglePlatformCommission = async (enabled: boolean) => {
    try {
      const { error } = await supabase.rpc(
        "update_promotions_commission_toggle",
        { p_enabled: enabled }
      );
      if (error) throw error;
      setPlatformCommissionEnabled(enabled);
      toast.success(
        `Platform-wide promotion commission ${enabled ? "enabled" : "disabled"}`
      );
    } catch (error) {
      console.error("Error updating commission toggle:", error);
      toast.error("Failed to update setting");
    }
  };

  const productCountFor = (promotionId: string) =>
    promoProducts.filter((pp) => pp.promotion_id === promotionId).length;

  const filteredPromotions = promotions.filter((p) =>
    p.title.toLowerCase().includes(promoSearch.trim().toLowerCase())
  );

  const filteredGrabs = grabs.filter((g) => {
    const matchesPromo =
      grabPromotionFilter === "all" || g.promotion_id === grabPromotionFilter;
    const q = grabSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      g.buyer?.full_name?.toLowerCase().includes(q) ||
      g.buyer?.email?.toLowerCase().includes(q) ||
      g.displayTitle?.toLowerCase().includes(q);
    return matchesPromo && matchesSearch;
  });

  const filteredProductOptions = productOptions.filter((p) =>
    p.title.toLowerCase().includes(productSearch.trim().toLowerCase())
  );

  if (loading) {
    return (
      <div className="rounded-3xl bg-flora-card p-6 shadow-card">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded-full bg-flora-chip"></div>
          <div className="h-32 rounded-2xl bg-flora-chip"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-full border border-flora-ink/15 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveView("promotions")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeView === "promotions"
                  ? "bg-flora-ink text-white"
                  : "text-flora-ink hover:bg-flora-chip"
              }`}
            >
              Promotions
              {promotions.length > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeView === "promotions"
                      ? "bg-white/20 text-white"
                      : "bg-flora-chip text-flora-ink"
                  }`}
                >
                  {promotions.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveView("fulfillment")}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeView === "fulfillment"
                  ? "bg-flora-ink text-white"
                  : "text-flora-ink hover:bg-flora-chip"
              }`}
            >
              Fulfillment Queue
              {grabs.filter((g) => g.status === "pending_fulfillment").length >
                0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeView === "fulfillment"
                      ? "bg-white/20 text-white"
                      : "bg-flora-chip text-flora-ink"
                  }`}
                >
                  {
                    grabs.filter((g) => g.status === "pending_fulfillment")
                      .length
                  }
                </span>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-2 rounded-full border border-flora-ink/15 bg-white px-4 py-1.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {activeView === "promotions" && (
          <div className="mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-flora-muted">
                Timed "grab as much as you can" giveaways. No payment is
                processed - grabbed items are fulfilled manually from the
                queue.
              </p>
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    onClick={openCreateDialog}
                    className="inline-flex items-center gap-2 rounded-full bg-flora-ink px-4 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    <Plus className="h-4 w-4" />
                    New Promotion
                  </button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-flora-ink">
                      {editingPromotion ? "Edit Promotion" : "New Promotion"}
                    </DialogTitle>
                    <DialogDescription className="text-flora-muted">
                      {editingPromotion
                        ? "Update the schedule, products, or details of this promotion."
                        : "Created as a draft - use the status control on the list to schedule or go live when you're ready."}
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSavePromotion(new FormData(e.currentTarget));
                    }}
                  >
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title" className="text-flora-ink">
                          Title *
                        </Label>
                        <Input
                          id="title"
                          name="title"
                          required
                          defaultValue={editingPromotion?.title || ""}
                          placeholder="e.g. Campus Essentials Dash"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="description"
                          className="text-flora-ink"
                        >
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          name="description"
                          rows={2}
                          defaultValue={editingPromotion?.description || ""}
                          placeholder="Get ready to grab epic items in just 3 seconds!"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label
                            htmlFor="duration_seconds"
                            className="text-flora-ink"
                          >
                            Dash length (sec) *
                          </Label>
                          <Input
                            id="duration_seconds"
                            name="duration_seconds"
                            type="number"
                            min={1}
                            required
                            defaultValue={
                              editingPromotion?.duration_seconds || 3
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="starts_at" className="text-flora-ink">
                            Opens
                          </Label>
                          <Input
                            id="starts_at"
                            name="starts_at"
                            type="datetime-local"
                            defaultValue={toLocalInputValue(
                              editingPromotion?.starts_at || null
                            )}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ends_at" className="text-flora-ink">
                            Closes
                          </Label>
                          <Input
                            id="ends_at"
                            name="ends_at"
                            type="datetime-local"
                            defaultValue={toLocalInputValue(
                              editingPromotion?.ends_at || null
                            )}
                          />
                        </div>
                      </div>

                      {/* Banner image - shown on the Marketplace banner
                          carousel and the app-entry modal. */}
                      <div>
                        <Label className="text-flora-ink">Banner Image</Label>
                        <div className="mt-1 flex items-center gap-3">
                          {bannerImageUrl ? (
                            <div className="relative h-16 w-28 overflow-hidden rounded-xl bg-flora-chip">
                              <img
                                src={bannerImageUrl}
                                alt="Banner preview"
                                className="h-full w-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setBannerImageUrl(null)}
                                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <label className="flex h-16 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-flora-ink/20 text-flora-muted hover:border-flora-leaf">
                              {bannerUploading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : (
                                <ImagePlus className="h-5 w-5" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                hidden
                                onChange={(e) => {
                                  if (e.target.files?.[0]) {
                                    handleBannerUpload(e.target.files[0]);
                                  }
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                          <p className="text-xs text-flora-muted">
                            Optional. Shown on the Marketplace banner
                            carousel and the app-entry modal.
                          </p>
                        </div>
                      </div>

                      {isSuperAdmin && (
                        <div className="flex items-center justify-between rounded-2xl bg-flora-chip/30 p-3">
                          <div>
                            <p className="text-sm font-medium text-flora-ink">
                              Charge commission on this promotion
                            </p>
                            <p className="text-xs text-flora-muted">
                              Super Admin only. Also requires the
                              platform-wide setting to be on.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPromoCommissionEnabled((v) => !v)
                            }
                            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                              promoCommissionEnabled
                                ? "bg-flora-ink"
                                : "bg-flora-chip"
                            }`}
                          >
                            <span
                              className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                                promoCommissionEnabled ? "left-6" : "left-1"
                              }`}
                            />
                          </button>
                        </div>
                      )}

                      <div>
                        <Label className="text-flora-ink">
                          Products in this dash
                        </Label>
                        <div className="relative mt-1">
                          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
                          <Input
                            placeholder="Search catalog products..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm"
                          />
                        </div>
                        <div className="mt-2 max-h-40 overflow-y-auto rounded-2xl border border-flora-ink/10 p-2">
                          {filteredProductOptions.length === 0 ? (
                            <p className="p-2 text-sm text-flora-muted">
                              No products found
                            </p>
                          ) : (
                            filteredProductOptions.map((product) => (
                              <label
                                key={product.id}
                                className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-flora-ink hover:bg-flora-chip"
                              >
                                <input
                                  type="checkbox"
                                  checked={productList.some(
                                    (item) => item.product_id === product.id
                                  )}
                                  onChange={(e) =>
                                    toggleCatalogProduct(
                                      product,
                                      e.target.checked
                                    )
                                  }
                                />
                                {product.title} - ₦
                                {product.price?.toLocaleString()}
                              </label>
                            ))
                          )}
                        </div>

                        {/* Custom (non-catalog) items - e.g. sponsored
                            giveaway prizes that aren't real marketplace
                            listings. */}
                        <div className="mt-3 rounded-2xl border border-dashed border-flora-ink/20 p-3">
                          <p className="text-sm font-medium text-flora-ink">
                            Add a custom item
                          </p>
                          <p className="text-xs text-flora-muted">
                            For prizes that aren't in the product catalog.
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Title"
                              value={customTitle}
                              onChange={(e) => setCustomTitle(e.target.value)}
                            />
                            <Input
                              placeholder="Display price (₦, optional)"
                              type="number"
                              value={customPrice}
                              onChange={(e) => setCustomPrice(e.target.value)}
                            />
                          </div>
                          <div className="mt-2 flex items-center gap-3">
                            {customImageUrl ? (
                              <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-flora-chip">
                                <img
                                  src={customImageUrl}
                                  alt="Custom item preview"
                                  className="h-full w-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => setCustomImageUrl(null)}
                                  className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-flora-ink/20 text-flora-muted hover:border-flora-leaf">
                                {customImageUploading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <ImagePlus className="h-4 w-4" />
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  hidden
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleCustomImageUpload(
                                        e.target.files[0]
                                      );
                                    }
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addCustomProduct}
                              disabled={!customTitle.trim() || !customImageUrl}
                            >
                              Add Item
                            </Button>
                          </div>
                        </div>

                        {productList.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            <p className="text-xs font-medium text-flora-muted">
                              In this dash ({productList.length}):
                            </p>
                            {productList.map((item, index) => {
                              const catalogMatch = item.product_id
                                ? productOptions.find(
                                    (p) => p.id === item.product_id
                                  )
                                : null;
                              const label = catalogMatch
                                ? catalogMatch.title
                                : item.custom_title || "Custom item";
                              return (
                                <div
                                  key={item.id || `${item.product_id}-${index}`}
                                  className="flex items-center justify-between rounded-xl bg-flora-chip/30 px-3 py-1.5 text-sm"
                                >
                                  <span className="text-flora-ink">
                                    {label}
                                    {!catalogMatch && (
                                      <span className="ml-1.5 rounded-full bg-flora-chip px-1.5 py-0.5 text-[10px] font-medium text-flora-muted">
                                        custom
                                      </span>
                                    )}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeProductListItem(index)
                                    }
                                    className="text-flora-muted hover:text-red-600"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline">
                            Cancel
                          </Button>
                        </DialogTrigger>
                        <Button type="submit">
                          {editingPromotion ? "Save Changes" : "Create Draft"}
                        </Button>
                      </div>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
              <Input
                placeholder="Search promotions by title..."
                value={promoSearch}
                onChange={(e) => setPromoSearch(e.target.value)}
                className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm focus-visible:ring-flora-ink"
              />
            </div>

            {promotions.length === 0 ? (
              <div className="py-12 text-center">
                <Zap className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
                <h3 className="mb-2 text-lg font-semibold text-flora-ink">
                  No promotions yet
                </h3>
                <p className="text-flora-muted">
                  Create your first "3-Second Cart Dash" to get started
                </p>
              </div>
            ) : filteredPromotions.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="mx-auto mb-4 h-10 w-10 text-flora-muted" />
                <p className="text-flora-muted">
                  No promotions match "{promoSearch}"
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                      <TableHead className="text-flora-ink">Title</TableHead>
                      <TableHead className="text-flora-ink">Status</TableHead>
                      <TableHead className="text-flora-ink">
                        Schedule
                      </TableHead>
                      <TableHead className="text-flora-ink">
                        Dash Length
                      </TableHead>
                      <TableHead className="text-flora-ink">
                        Products
                      </TableHead>
                      <TableHead className="text-flora-ink">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPromotions.map((promotion) => (
                      <TableRow
                        key={promotion.id}
                        className="hover:bg-flora-chip/20"
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {promotion.banner_image_url && (
                              <img
                                src={promotion.banner_image_url}
                                alt=""
                                className="h-8 w-12 shrink-0 rounded-md object-cover"
                              />
                            )}
                            <div>
                              <p className="font-medium text-flora-ink">
                                {promotion.title}
                              </p>
                              {promotion.description && (
                                <p className="max-w-xs truncate text-sm text-flora-muted">
                                  {promotion.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPillClasses(
                                promotion.status
                              )}`}
                            >
                              {promotion.status}
                            </span>
                            {promotion.commission_enabled && (
                              <span className="rounded-full bg-flora-chip px-2 py-0.5 text-[10px] font-medium text-flora-ink">
                                Commission on
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-flora-muted">
                          {promotion.starts_at ? (
                            <>
                              {new Date(promotion.starts_at).toLocaleString()}
                              {promotion.ends_at && (
                                <>
                                  {" "}
                                  &rarr;{" "}
                                  {new Date(
                                    promotion.ends_at
                                  ).toLocaleString()}
                                </>
                              )}
                            </>
                          ) : (
                            "Not scheduled"
                          )}
                        </TableCell>
                        <TableCell className="text-flora-muted">
                          {promotion.duration_seconds}s
                        </TableCell>
                        <TableCell className="text-flora-muted">
                          <span className="inline-flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {productCountFor(promotion.id)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditDialog(promotion)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-flora-ink/15 bg-white px-3 py-1.5 text-xs font-medium text-flora-ink transition hover:bg-flora-chip"
                            >
                              Edit
                            </button>

                            <PromotionStatusControl
                              currentStatus={promotion.status}
                              promotionTitle={promotion.title}
                              onConfirm={(status) =>
                                handleSetStatus(promotion.id, status)
                              }
                            />

                            {promotion.status === "draft" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                  >
                                    Delete
                                  </button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-3xl">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="text-flora-ink">
                                      Delete Draft Promotion
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-flora-muted">
                                      Are you sure you want to delete "
                                      {promotion.title}"? This is only
                                      possible while it's still a draft.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>
                                      Cancel
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() =>
                                        handleDeleteDraft(promotion.id)
                                      }
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {isSuperAdmin && (
        <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-flora-ink">
            Platform-Wide Promotion Commission
          </h2>
          <p className="mt-1 text-sm text-flora-muted">
            Super Admin only. The master switch - a promotion's own
            commission toggle (set per-promotion in its edit dialog) only
            takes effect if this is also on. For future use - grabs never
            charge any fee today regardless of either setting.
          </p>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-flora-chip/30 p-4">
            <div>
              <p className="font-medium text-flora-ink">
                Allow commission charging on promotions
              </p>
              <p className="text-sm text-flora-muted">
                Currently {platformCommissionEnabled ? "enabled" : "disabled"}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className={`relative h-7 w-12 rounded-full transition ${
                    platformCommissionEnabled ? "bg-flora-ink" : "bg-flora-chip"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
                      platformCommissionEnabled ? "left-6" : "left-1"
                    }`}
                  />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-flora-ink">
                    {platformCommissionEnabled ? "Disable" : "Enable"}{" "}
                    Platform-Wide Promotion Commission
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-flora-muted">
                    This is a platform-wide, future-use setting. It has no
                    effect on grabs today - flip it only once real
                    commission-charging logic exists for promotions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() =>
                      handleTogglePlatformCommission(!platformCommissionEnabled)
                    }
                  >
                    {platformCommissionEnabled ? "Disable" : "Enable"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}

      {activeView === "fulfillment" && (
        <div className="rounded-3xl bg-flora-card p-5 shadow-card sm:p-6">
          <h2 className="text-lg font-bold text-flora-ink">
            Fulfillment Queue
          </h2>
          <p className="mt-1 text-sm text-flora-muted">
            Every promo grab across all promotions - pack and ship these
            manually, there's no real order or payment behind them.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
              <Input
                placeholder="Search by buyer or product..."
                value={grabSearch}
                onChange={(e) => setGrabSearch(e.target.value)}
                className="rounded-full border-flora-ink/15 bg-white pl-10 text-sm focus-visible:ring-flora-ink"
              />
            </div>
            <select
              value={grabPromotionFilter}
              onChange={(e) => setGrabPromotionFilter(e.target.value)}
              className="rounded-full border border-flora-ink/15 bg-white px-3 py-2 text-sm text-flora-ink"
            >
              <option value="all">All Promotions</option>
              {promotions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          {grabs.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
              <h3 className="mb-2 text-lg font-semibold text-flora-ink">
                No grabs yet
              </h3>
              <p className="text-flora-muted">
                Grabbed items will show up here for manual fulfillment
              </p>
            </div>
          ) : filteredGrabs.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="mx-auto mb-4 h-10 w-10 text-flora-muted" />
              <p className="text-flora-muted">No grabs match your filters</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-flora-ink/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-flora-chip/40 hover:bg-flora-chip/40">
                    <TableHead className="text-flora-ink">Buyer</TableHead>
                    <TableHead className="text-flora-ink">Product</TableHead>
                    <TableHead className="text-flora-ink">Qty</TableHead>
                    <TableHead className="text-flora-ink">
                      Shipping
                    </TableHead>
                    <TableHead className="text-flora-ink">Status</TableHead>
                    <TableHead className="text-flora-ink">Grabbed</TableHead>
                    <TableHead className="text-flora-ink">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGrabs.map((grab) => (
                    <TableRow key={grab.id} className="hover:bg-flora-chip/20">
                      <TableCell>
                        <p className="font-medium text-flora-ink">
                          {grab.buyer?.full_name || "Unknown"}
                        </p>
                        <p className="text-sm text-flora-muted">
                          {grab.buyer?.email}
                        </p>
                      </TableCell>
                      <TableCell className="text-flora-ink">
                        {grab.displayTitle}
                      </TableCell>
                      <TableCell className="text-flora-muted">
                        {grab.quantity}
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-flora-muted">
                        {grab.shipping_address ? (
                          <>
                            <p className="truncate">{grab.shipping_address}</p>
                            {grab.contact_phone && (
                              <p>{grab.contact_phone}</p>
                            )}
                          </>
                        ) : (
                          <span className="italic">Not submitted yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${grabStatusPillClasses(
                            grab.status
                          )}`}
                        >
                          {grab.status.replace("_", " ")}
                        </span>
                        {grab.status === "cancelled" && grab.admin_notes && (
                          <p className="mt-1 text-xs text-flora-muted">
                            {grab.admin_notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-flora-muted">
                        {new Date(grab.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {grab.status === "pending_fulfillment" && (
                          <div className="flex flex-wrap gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-full bg-flora-ink px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
                                >
                                  Mark Shipped
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="rounded-3xl">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-flora-ink">
                                    Mark as Shipped
                                  </AlertDialogTitle>
                                  <AlertDialogDescription className="text-flora-muted">
                                    This notifies {grab.buyer?.full_name || "the buyer"} that their item is on the way.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      handleGrabStatus(grab.id, "shipped")
                                    }
                                  >
                                    Mark Shipped
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <Dialog>
                              <DialogTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                                >
                                  Cancel
                                </button>
                              </DialogTrigger>
                              <DialogContent className="rounded-3xl">
                                <DialogHeader>
                                  <DialogTitle className="text-flora-ink">
                                    Cancel Grab
                                  </DialogTitle>
                                  <DialogDescription className="text-flora-muted">
                                    Provide a reason - {grab.buyer?.full_name || "the buyer"} will be notified.
                                  </DialogDescription>
                                </DialogHeader>
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(
                                      e.currentTarget
                                    );
                                    const reason = formData.get(
                                      "cancel_reason"
                                    ) as string;
                                    if (reason.trim()) {
                                      handleGrabStatus(
                                        grab.id,
                                        "cancelled",
                                        reason.trim()
                                      );
                                    }
                                  }}
                                >
                                  <div className="space-y-4">
                                    <div>
                                      <Label
                                        htmlFor="cancel_reason"
                                        className="text-flora-ink"
                                      >
                                        Reason *
                                      </Label>
                                      <Textarea
                                        name="cancel_reason"
                                        placeholder="e.g., Out of stock to fulfill from, duplicate grab..."
                                        required
                                        rows={3}
                                      />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <DialogTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                        >
                                          Back
                                        </Button>
                                      </DialogTrigger>
                                      <Button
                                        type="submit"
                                        variant="destructive"
                                      >
                                        Cancel Grab
                                      </Button>
                                    </div>
                                  </div>
                                </form>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                        {grab.status === "shipped" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full bg-flora-leaf px-3 py-1.5 text-xs font-medium text-white transition hover:brightness-110"
                              >
                                Mark Delivered
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-3xl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-flora-ink">
                                  Mark as Delivered
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-flora-muted">
                                  Confirms this item has reached {grab.buyer?.full_name || "the buyer"}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleGrabStatus(grab.id, "delivered")
                                  }
                                >
                                  Mark Delivered
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromotionsTab;
