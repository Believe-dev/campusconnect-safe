import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useAuth } from "@/hooks/useAuth";
import { useRealTimeOrders } from "@/hooks/useRealTimeOrders";
import { cn } from "@/lib/utils";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  Timer,
  MessageCircle,
  Phone,
  RefreshCw,
} from "lucide-react";
import { findOrCreateConversation } from "@/utils/conversationUtils";
import { useNavigate } from "react-router-dom";
import { ProfileReviewModal } from "@/components/reviews/ProfileReviewModal";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { useSellerSubscription } from "@/hooks/useSellerSubscription";
import { approveSellerEscrow } from "@/services/anchorBaasService";

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  selected_size?: string;
  total_amount: number;
  commission_amount: number;
  status: string;
  payment_method?: string;
  delivery_method?: string;
  shipping_address?: string;
  university_name?: string;
  tracking_info?: string;
  created_at: string;
  confirmed_at?: string;
  auto_confirm_at?: string;
  escrow_released?: boolean;
  product?: {
    title: string;
    images?: string[];
  };
  seller?: {
    full_name: string;
    phone_number?: string;
  };
  buyer?: {
    full_name: string;
    phone_number?: string;
  };
  escrow_transactions?: {
    id: string;
    status: string;
    seller_amount: number;
    auto_release_at?: string;
  }[];
}

const BTN_PRIMARY =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-flora-ink px-4 py-2 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none sm:text-sm";
const BTN_OUTLINE =
  "inline-flex items-center justify-center gap-1.5 rounded-full border border-flora-ink/15 bg-white px-4 py-2 text-xs font-medium text-flora-ink transition hover:bg-flora-chip disabled:opacity-50 disabled:pointer-events-none sm:text-sm";

const STATUS_TONE: Record<string, string> = {
  pending: "bg-flora-chip text-flora-muted",
  paid: "bg-flora-tagBg text-flora-tagText",
  shipped: "bg-flora-chip text-flora-ink",
  delivered: "bg-flora-tagBg text-flora-tagText",
  confirmed: "bg-flora-leaf text-white",
  disputed: "bg-red-50 text-red-600",
};

// The order lifecycle is a fixed, linear pipeline (unlike arbitrary content),
// so a segmented step bar communicates progress at a glance in the list —
// a status pill alone makes buyers/sellers re-read text to know where an
// order stands.
const ORDER_STAGES = ["pending", "paid", "shipped", "delivered", "confirmed"];
const STAGE_LABELS: Record<string, string> = {
  pending: "Awaiting payment",
  paid: "Payment received",
  shipped: "Shipped",
  delivered: "Delivered — awaiting your confirmation",
  confirmed: "Confirmed",
};

const OrderProgress = ({ status }: { status: string }) => {
  if (status === "disputed") {
    return (
      <div className="mt-3">
        <div className="flex items-center gap-1">
          {ORDER_STAGES.map((stage) => (
            <div key={stage} className="h-1.5 flex-1 rounded-full bg-red-200" />
          ))}
        </div>
        <p className="mt-1.5 text-[11px] font-medium text-red-600">Disputed</p>
      </div>
    );
  }

  const currentIndex = ORDER_STAGES.indexOf(status);

  return (
    <div className="mt-3">
      <div className="flex items-center gap-1">
        {ORDER_STAGES.map((stage, i) => (
          <div
            key={stage}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              i <= currentIndex ? "bg-flora-leaf" : "bg-flora-chip"
            )}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-flora-muted">
        {STAGE_LABELS[status] ?? status}
      </p>
    </div>
  );
};

const OrderEmptyState = ({ title, copy }: { title: string; copy: string }) => (
  <div className="rounded-3xl bg-flora-card p-8 text-center shadow-card sm:p-10">
    <Package className="mx-auto mb-3 h-10 w-10 text-flora-muted sm:mb-4 sm:h-12 sm:w-12" />
    <p className="text-base font-medium text-flora-ink sm:text-lg">{title}</p>
    <p className="text-sm text-flora-muted sm:text-base">{copy}</p>
  </div>
);

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("buyer");
  const [profile, setProfile] = useState<any>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const { toast } = useToast();
  const { canAccessSellerFeature } = useSellerSubscription();
  useRealTimeOrders();

  const [offlineOrders, setOfflineOrders] = useOfflineStorage<Order[]>({
    key: `orders_${user?.id}`,
    defaultValue: [],
    ttl: 30 * 60 * 1000, // 30 minutes
  });

  // Fetch user profile to determine account type
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("user_id", user.id)
        .single();
      setProfile(data);
    };
    fetchProfile();
  }, [user]);

  const fetchOrders = async () => {
    if (!user) return [];

    const { data, error } = await supabase
      .from("orders")
      .select(
        `
        *,
        products!inner (title, images),
        seller_profile:profiles!orders_seller_id_fkey (full_name, phone_number),
        buyer_profile:profiles!orders_buyer_id_fkey (full_name, phone_number),
        escrow_transactions (id, status, seller_amount, auto_release_at)
      `
      )
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transform data to match expected structure
    const transformedOrders = (data || []).map((order) => ({
      ...order,
      product: order.products,
      seller: order.seller_profile,
      buyer: order.buyer_profile,
      escrow_transactions: Array.isArray(order.escrow_transactions)
        ? order.escrow_transactions
        : order.escrow_transactions
        ? [order.escrow_transactions]
        : [],
    }));

    // Store offline for next time
    setOfflineOrders(transformedOrders);
    return transformedOrders;
  };

  const {
    data: orders = offlineOrders,
    isLoading,
    error,
    refetch,
  } = useOptimizedQuery({
    queryKey: ["orders", user?.id],
    queryFn: fetchOrders,
    enabled: !!user,
    placeholderData: offlineOrders,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    // Order status embeds escrow_transactions (payment/release state) - this must
    // never be served stale, so it's excluded from the normal 15min cache policy.
    alwaysFresh: true,
  });

  const handleRefresh = useCallback(async () => {
    await refetch();
    setLastUpdated(new Date());
  }, [refetch]);

  // Real-time order updates with automatic background refresh
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`orders-realtime-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        async (payload) => {
          // Check if this order involves the current user
          const newOrder = payload.new as any;
          const oldOrder = payload.old as any;
          if (
            newOrder?.buyer_id === user.id ||
            newOrder?.seller_id === user.id ||
            oldOrder?.buyer_id === user.id ||
            oldOrder?.seller_id === user.id
          ) {
            // Show visual feedback for the updated order
            const orderId = newOrder?.id || oldOrder?.id;
            if (orderId) {
              setUpdatingOrderId(orderId);
              setTimeout(() => setUpdatingOrderId(null), 2000);
            }

            // Force immediate refetch and UI update
            await refetch();
            setLastUpdated(new Date());
            
            // Also update offline storage immediately
            if (newOrder) {
              setOfflineOrders((prevOrders) =>
                prevOrders.map((order) =>
                  order.id === orderId
                    ? { ...order, ...newOrder }
                    : order
                )
              );
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "escrow_transactions",
        },
        async (payload) => {
          // Force immediate refetch when escrow status changes
          await refetch();
          setLastUpdated(new Date());
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "disputes",
        },
        async (payload) => {
          // Force immediate refetch when disputes are created/updated
          await refetch();
          setLastUpdated(new Date());
        }
      )
      .subscribe((status) => {
        setIsRealTimeConnected(status === "SUBSCRIBED");
      });

    // Also listen for window focus to refresh data
    const handleFocus = async () => {
      await refetch();
      setLastUpdated(new Date());
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, refetch]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Couldn't load your orders",
        description: "Please refresh the page or try again shortly.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const updateOrderStatus = async (
    orderId: string,
    status: string,
    trackingInfo?: string
  ) => {
    try {
      // Optimistic update - immediately update UI
      setOfflineOrders((prevOrders) =>
        prevOrders.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status,
                ...(trackingInfo && { tracking_info: trackingInfo }),
              }
            : order
        )
      );

      const updateData: any = { status };
      if (trackingInfo) updateData.tracking_info = trackingInfo;

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) {
        // Revert optimistic update on error
        await refetch();
        throw error;
      }

      // Force immediate UI refresh after successful update
      await refetch();
      setLastUpdated(new Date());

      // Handle escrow release for confirmed orders. Goes through the edge
      // function's buyer-release branch - it's the only thing that can call
      // release_escrow_funds now that it's service_role-only, and it
      // already ensures the seller has a wallet internally, so there's no
      // separate wallet upsert needed here.
      if (status === "confirmed") {
        try {
          const order = orders.find((o) => o.id === orderId);
          if (order?.escrow_transactions?.[0]) {
            const result = await approveSellerEscrow(orderId);
            if (!result.success) {
              console.error("Escrow release error:", result.message);
              toast({
                title: "Payment Release Failed",
                description: `Order confirmed, but releasing payment to the seller failed: ${result.message}. Please contact support.`,
                variant: "destructive",
              });
            }
          }
        } catch (escrowError) {
          console.error("Escrow handling error:", escrowError);
          toast({
            title: "Payment Release Failed",
            description:
              "Order confirmed, but releasing payment to the seller failed unexpectedly. Please contact support.",
            variant: "destructive",
          });
        }
      }

      // Send notifications and emails for shipped/delivered status
      if (status === "shipped" || status === "delivered") {
        const order = orders.find((o) => o.id === orderId);
        if (order) {
          const { data: buyerProfile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("user_id", order.buyer_id)
            .single();

          if (buyerProfile) {
            const statusMessage =
              status === "shipped"
                ? "Your order has been shipped! 📦"
                : "Your order has been delivered! 🎉";

            const emailSubject =
              status === "shipped"
                ? "Order Shipped - UniMarket"
                : "Order Delivered - UniMarket";

            // Create notification
            const { sendOrderNotification } = await import(
              "@/utils/notificationService"
            );
            await sendOrderNotification(
              order.buyer_id,
              statusMessage,
              `Order for ${order.product?.title} has been ${status}. ${
                trackingInfo || ""
              }`,
              orderId
            );

            // Send email
            try {
              await supabase.functions.invoke("send-email", {
                body: {
                  to: buyerProfile.email,
                  subject: emailSubject,
                  html: `
                    <h2>${statusMessage}</h2>
                    <p>Hello ${buyerProfile.full_name},</p>
                    <p>Your order has been ${status}:</p>
                    <ul>
                      <li><strong>Product:</strong> ${order.product?.title}</li>
                      <li><strong>Status:</strong> ${
                        status.charAt(0).toUpperCase() + status.slice(1)
                      }</li>
                      ${
                        trackingInfo
                          ? `<li><strong>Tracking:</strong> ${trackingInfo}</li>`
                          : ""
                      }
                    </ul>
                    <p>You can track your order in your account dashboard.</p>
                    <p>Best regards,<br>UniMarket Team</p>
                  `,
                },
              });
            } catch (emailError) {
              // Error handled silently
            }
          }
        }
      }

      toast({
        title: "Order Updated",
        description: `Order status updated to ${status}`,
      });

    } catch (error) {
      // Revert optimistic update on error
      await refetch();
      toast({
        title: "Couldn't update this order",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const reportIssue = async (
    orderId: string,
    reason: string,
    description: string
  ) => {
    try {
      if (!user) {
        toast({
          title: "You're not signed in",
          description: "Please sign in and try again.",
          variant: "destructive",
        });
        return;
      }

      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        toast({
          title: "Order not found",
          description: "This order may have been removed. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      // Verify user exists in profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileData) {
        toast({
          title: "Couldn't verify your profile",
          description: "Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      // Get escrow transaction ID for the order
      const escrowTransaction = order.escrow_transactions?.[0];
      if (!escrowTransaction) {
        toast({
          title: "Couldn't report this issue",
          description: "This order doesn't have an associated payment record. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      // Create dispute record in the disputes table
      const { error: disputeError } = await supabase.from("disputes").insert({
        order_id: orderId,
        escrow_transaction_id: escrowTransaction.id,
        reported_by: user.id,
        reason: reason,
        description: description,
        status: "open",
      });

      if (disputeError) {
        console.error("Dispute creation error:", disputeError);
        throw disputeError;
      }

      // Update order status to disputed
      await updateOrderStatus(orderId, "disputed");

      toast({
        title: "Issue Reported",
        description:
          "Your issue has been reported and the order is now under review",
      });
    } catch (error) {
      console.error("Report issue error:", error);
      toast({
        title: "Couldn't report issue",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    }
  };

  const withdrawDispute = async (orderId: string) => {
    try {
      // Get the dispute ID for this order
      const { data: dispute } = await supabase
        .from("disputes")
        .select("id")
        .eq("order_id", orderId)
        .eq("status", "open")
        .single();

      if (!dispute) {
        toast({
          title: "No dispute to withdraw",
          description: "This order doesn't have an open dispute.",
          variant: "destructive",
        });
        return;
      }

      // Use the withdraw_dispute function
      const { data, error } = await supabase.rpc("withdraw_dispute", {
        dispute_id: dispute.id,
      });

      if (error) {
        console.error("Error withdrawing dispute:", error);
        throw error;
      }

      if (!data) {
        toast({
          title: "Couldn't withdraw dispute",
          description: "You may not have permission to withdraw this dispute.",
          variant: "destructive",
        });
        return;
      }

      // Update order status back to delivered
      await updateOrderStatus(orderId, "delivered");

      toast({
        title: "Dispute Withdrawn",
        description:
          "Your dispute has been withdrawn and closed. Order status restored to delivered.",
      });
    } catch (error) {
      toast({
        title: "Couldn't withdraw dispute",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />;
      case "paid":
        return <Shield className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <Package className="h-4 w-4" />;
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />;
      case "disputed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getCurrentUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  };

  const getBuyerOrders = async () => {
    const user = await getCurrentUser();
    return orders.filter((order) => order.buyer_id === user?.id);
  };

  const getSellerOrders = async () => {
    const user = await getCurrentUser();
    return orders.filter((order) => order.seller_id === user?.id);
  };

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewOrderData, setReviewOrderData] = useState<{
    orderId: string;
    sellerId: string;
    sellerName: string;
  } | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

  // Count unattended orders
  const getUnattendedBuyerCount = () => {
    return orders.filter(
      (order) => order.buyer_id === user?.id && order.status === "delivered"
    ).length;
  };

  const getUnattendedSellerCount = () => {
    return orders.filter(
      (order) =>
        order.seller_id === user?.id &&
        (order.status === "paid" || order.status === "shipped")
    ).length;
  };

  const handleChat = async (order: Order, isSeller: boolean) => {
    if (!user) return;

    const otherUserId = isSeller ? order.buyer_id : order.seller_id;
    const otherUserName = isSeller
      ? order.buyer?.full_name
      : order.seller?.full_name;

    try {
      const conversationId = await findOrCreateConversation(
        user.id,
        otherUserId
      );
      if (conversationId) {
        const draftMessage = `Hi! Regarding order #${order.id.slice(-8)} for ${
          order.product?.title
        }.`;
        navigate(
          `/chat/${conversationId}?draft=${encodeURIComponent(draftMessage)}`
        );
      }
    } catch (error) {
      toast({
        title: "Couldn't start conversation",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWhatsApp = (order: Order, isSeller: boolean) => {
    const otherUser = isSeller ? order.buyer : order.seller;
    const phoneNumber = otherUser?.phone_number;

    if (!phoneNumber) {
      toast({
        title: "Phone Number Not Available",
        description: "This user hasn't provided a phone number.",
        variant: "destructive",
      });
      return;
    }

    const message =
      `Hi! I'm contacting you regarding order #${order.id.slice(-8)}:\n\n` +
      `Product: ${order.product?.title}\n` +
      `Quantity: ${order.quantity}\n` +
      `Total Amount: ₦${order.total_amount.toLocaleString()}\n` +
      `Order Status: ${order.status}\n` +
      `Order Date: ${new Date(order.created_at).toLocaleDateString()}\n\n` +
      `Please let me know the status of this order and the drivers number`;

    const whatsappUrl = `https://wa.me/${phoneNumber.replace(
      /[^0-9]/g,
      ""
    )}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const renderOrderCard = (order: Order, isSeller: boolean = false) => {
    const escrow = order.escrow_transactions?.[0];
    const autoReleaseDate = escrow?.auto_release_at
      ? new Date(escrow.auto_release_at)
      : null;
    const daysUntilAutoRelease = autoReleaseDate
      ? Math.ceil(
          (autoReleaseDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      : null;

    return (
      <div
        key={order.id}
        className={cn(
          "mb-3 rounded-3xl bg-flora-card p-4 shadow-card transition-all duration-500 sm:mb-4 sm:p-5",
          updatingOrderId === order.id && "bg-flora-tagBg/30 ring-2 ring-flora-leaf/50"
        )}
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <h3 className="line-clamp-2 text-sm font-semibold text-flora-ink sm:text-base">
                {order.product?.title}
              </h3>
              <div className="flex flex-wrap gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                    STATUS_TONE[order.status] || "bg-flora-chip text-flora-muted"
                  )}
                >
                  {getStatusIcon(order.status)}
                  {order.status}
                </span>
                {escrow && escrow.status === "held" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-flora-ink/15 px-2.5 py-1 text-xs font-medium text-flora-ink">
                    <Shield className="h-3 w-3" />
                    <span className="hidden sm:inline">Escrow Protected</span>
                    <span className="sm:hidden">Protected</span>
                  </span>
                )}
              </div>
            </div>

            <OrderProgress status={order.status} />

            <div className="mt-3 space-y-1 text-xs text-flora-muted sm:text-sm">
              <p className="truncate">
                {isSeller ? (
                  `Buyer: ${order.buyer?.full_name}`
                ) : (
                  <span>
                    Seller:{" "}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/seller/${order.seller_id}`);
                      }}
                      className="text-flora-leaf underline hover:brightness-90"
                    >
                      {order.seller?.full_name}
                    </button>
                  </span>
                )}
              </p>
              {((isSeller && order.buyer?.phone_number) ||
                (!isSeller && order.seller?.phone_number)) && (
                <p className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {isSeller
                    ? order.buyer?.phone_number
                    : order.seller?.phone_number}
                </p>
              )}
            </div>
            <div className="space-y-1 text-xs text-flora-muted sm:text-sm">
              <p>
                Qty: {order.quantity}
                {order.selected_size && (
                  <span> • Size: {order.selected_size}</span>
                )}
                {" • Total: ₦"}
                {order.total_amount.toLocaleString()}
              </p>
              {isSeller && escrow && (
                <p className="text-xs text-flora-leaf">
                  You'll receive: ₦{escrow.seller_amount.toLocaleString()}
                </p>
              )}
              {isSeller && (order.shipping_address || order.delivery_method) && (
                <div className="mt-2 rounded-xl bg-flora-chip p-2 text-xs text-flora-ink">
                  <p className="flex items-center gap-1 font-medium">
                    {order.delivery_method === "pickup" ? (
                      <Package className="h-3 w-3" />
                    ) : (
                      <Truck className="h-3 w-3" />
                    )}
                    {order.delivery_method === "pickup"
                      ? "Pickup — buyer will collect from you"
                      : "Delivery"}
                  </p>
                  {order.delivery_method !== "pickup" && order.shipping_address && (
                    <p className="mt-1">{order.shipping_address}</p>
                  )}
                  {order.university_name && (
                    <p className="mt-1 text-flora-leaf">{order.university_name}</p>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-flora-muted">
              Ordered on {new Date(order.created_at).toLocaleDateString()}
            </p>

            {order.tracking_info && (
              <p className="mt-2 text-xs text-flora-muted sm:text-sm">
                Tracking: {order.tracking_info}
              </p>
            )}

            {daysUntilAutoRelease &&
              daysUntilAutoRelease > 0 &&
              order.status === "delivered" && (
                <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                  <Timer className="h-3 w-3" />
                  Auto-confirms in {daysUntilAutoRelease} day
                  {daysUntilAutoRelease !== 1 ? "s" : ""}
                </div>
              )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setSelectedOrder(order);
                setShowOrderDetails(true);
              }}
              className={cn(BTN_OUTLINE, "w-full sm:w-auto")}
            >
              <Package className="h-3.5 w-3.5" />
              View Details
            </button>

            <button
              type="button"
              onClick={() => handleChat(order, isSeller)}
              className={cn(BTN_OUTLINE, "w-full sm:w-auto")}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {isSeller ? "Chat Buyer" : "Chat Seller"}
            </button>

            {((isSeller && order.buyer?.phone_number) ||
              (!isSeller && order.seller?.phone_number)) && (
              <button
                type="button"
                onClick={() => handleWhatsApp(order, isSeller)}
                className={cn(BTN_OUTLINE, "w-full border-flora-leaf/30 text-flora-leaf sm:w-auto")}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </button>
            )}

            {isSeller ? (
              // Seller actions
              <>
                {order.status === "paid" && (
                  <button
                    type="button"
                    onClick={() =>
                      updateOrderStatus(
                        order.id,
                        "shipped",
                        "Package dispatched"
                      )
                    }
                    className={cn(BTN_PRIMARY, "w-full sm:w-auto")}
                  >
                    Mark as Shipped
                  </button>
                )}
                {order.status === "shipped" && (
                  <button
                    type="button"
                    onClick={() => updateOrderStatus(order.id, "delivered")}
                    className={cn(BTN_OUTLINE, "w-full sm:w-auto")}
                  >
                    Mark as Delivered
                  </button>
                )}
                {order.status === "confirmed" && order.escrow_released && (
                  <span className="rounded-full bg-flora-tagBg px-3 py-1.5 text-center text-xs font-medium text-flora-tagText">
                    Payment Released
                  </span>
                )}
              </>
            ) : (
              // Buyer actions
              <>
                {order.status === "delivered" && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        updateOrderStatus(order.id, "confirmed");
                        // Show review modal after confirmation
                        setTimeout(() => {
                          setReviewOrderData({
                            orderId: order.id,
                            sellerId: order.seller_id,
                            sellerName: order.seller?.full_name || "Seller",
                          });
                          setShowReviewModal(true);
                        }, 1500);
                      }}
                      className={cn(BTN_PRIMARY, "w-full sm:w-auto")}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Confirm Receipt
                    </button>
                    <Dialog
                      open={showReportDialog}
                      onOpenChange={setShowReportDialog}
                    >
                      <DialogTrigger asChild>
                        <button
                          type="button"
                          className={cn(BTN_OUTLINE, "w-full sm:w-auto")}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          Report Issue
                        </button>
                      </DialogTrigger>
                      <DialogContent className="w-[95vw] max-w-md border-flora-ink/10 bg-flora-card text-flora-ink">
                        <DialogHeader>
                          <DialogTitle className="text-lg text-flora-ink sm:text-xl">
                            Report Issue
                          </DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3 sm:space-y-4">
                          <div>
                            <Label
                              htmlFor="reason"
                              className="text-sm text-flora-ink sm:text-base"
                            >
                              Reason
                            </Label>
                            <select
                              className="mt-1 w-full rounded-xl border border-flora-ink/15 bg-white p-2 text-sm text-flora-ink sm:text-base"
                              value={reportReason}
                              onChange={(e) =>
                                setReportReason(e.target.value)
                              }
                            >
                              <option value="">Select a reason</option>
                              <option value="item_not_received">
                                Item not received
                              </option>
                              <option value="item_damaged">
                                Item damaged
                              </option>
                              <option value="wrong_item">
                                Wrong item received
                              </option>
                              <option value="not_as_described">
                                Not as described
                              </option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                          <div>
                            <Label
                              htmlFor="description"
                              className="text-sm text-flora-ink sm:text-base"
                            >
                              Description
                            </Label>
                            <Textarea
                              id="description"
                              placeholder="Please describe the issue in detail"
                              value={reportDescription}
                              onChange={(e) =>
                                setReportDescription(e.target.value)
                              }
                              className="mt-1 border-flora-ink/15 bg-white text-sm text-flora-ink sm:text-base"
                            />
                          </div>
                          <div className="flex flex-col gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                reportIssue(
                                  order.id,
                                  reportReason,
                                  reportDescription
                                );
                                setShowReportDialog(false);
                                setReportReason("");
                                setReportDescription("");
                              }}
                              disabled={!reportReason || !reportDescription}
                              className={cn(BTN_PRIMARY, "w-full")}
                            >
                              Submit Report
                            </button>
                            <div className="text-center">
                              <p className="mb-2 text-xs text-flora-muted">
                                Need immediate help?
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const message = `Hi! I need help with my order:\n\nOrder ID: #${order.id.slice(
                                    -8
                                  )}\nProduct: ${
                                    order.product?.title
                                  }\nSeller: ${
                                    order.seller?.full_name
                                  }\nQuantity: ${
                                    order.quantity
                                  }\nTotal Amount: ₦${order.total_amount.toLocaleString()}\nOrder Status: ${
                                    order.status
                                  }\nOrder Date: ${new Date(
                                    order.created_at
                                  ).toLocaleDateString()}\nShipping Address: ${
                                    order.shipping_address
                                  }\n\nIssue: ${reportReason} - ${reportDescription}\n\nPlease help me resolve this issue.`;
                                  window.open(
                                    `https://wa.me/2349133054018?text=${encodeURIComponent(
                                      message
                                    )}`,
                                    "_blank"
                                  );
                                }}
                                className={cn(
                                  BTN_OUTLINE,
                                  "border-flora-leaf/30 text-flora-leaf"
                                )}
                              >
                                Chat on WhatsApp
                              </button>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                {order.status === "disputed" && (
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => withdrawDispute(order.id)}
                      className={cn(BTN_OUTLINE, "w-full sm:w-auto")}
                    >
                      Withdraw Dispute
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="mb-4 h-8 rounded-full bg-flora-chip"></div>
            <div className="h-96 rounded-3xl bg-flora-chip"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 flex items-center justify-between sm:mb-6">
            <h1 className="text-2xl font-bold text-flora-ink sm:text-3xl">
              My Orders
            </h1>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  refetch();
                  setLastUpdated(new Date());
                }}
                disabled={isLoading}
                className={BTN_OUTLINE}
              >
                <RefreshCw
                  className={cn("h-3.5 w-3.5", isLoading && "animate-spin")}
                />
                <span className="hidden sm:inline">Reload</span>
              </button>
              <div className="flex items-center gap-2 text-xs text-flora-muted sm:text-sm">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    isRealTimeConnected ? "bg-flora-leaf" : "bg-flora-muted/50"
                  )}
                />
                <span className="hidden sm:inline">
                  {isRealTimeConnected ? "Live updates" : "Connecting..."}
                </span>
                <span className="text-xs">
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {profile?.account_type === "buyer" ? (
            // Buyer-only view
            <div>
              {orders.filter((order) => order.buyer_id === user?.id).length ===
              0 ? (
                <OrderEmptyState
                  title="No orders yet"
                  copy="Start shopping to see your orders here"
                />
              ) : (
                orders
                  .filter((order) => order.buyer_id === user?.id)
                  .map((order) => renderOrderCard(order, false))
              )}
            </div>
          ) : (
            // Seller view with tabs
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid h-fit w-full grid-cols-2 gap-1 rounded-2xl bg-flora-chip/70 p-1">
                <TabsTrigger value="buyer" className="relative rounded-xl">
                  As Buyer
                  {getUnattendedBuyerCount() > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {getUnattendedBuyerCount()}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="seller" className="relative rounded-xl">
                  As Seller
                  {getUnattendedSellerCount() > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {getUnattendedSellerCount()}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="buyer" className="mt-6">
                <div>
                  {orders.filter((order) => order.buyer_id === user?.id)
                    .length === 0 ? (
                    <OrderEmptyState
                      title="No orders yet"
                      copy="Start shopping to see your orders here"
                    />
                  ) : (
                    orders
                      .filter((order) => order.buyer_id === user?.id)
                      .map((order) => renderOrderCard(order, false))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="seller" className="mt-6">
                <div>
                  {(() => {
                    const sellerAccess = canAccessSellerFeature('seller_orders');
                    if (!sellerAccess.allowed) {
                      return (
                        <div className="rounded-3xl bg-flora-card p-8 text-center shadow-card sm:p-10">
                          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-flora-leafBright to-flora-leaf">
                            <Package className="h-8 w-8 text-white" />
                          </div>
                          <h3 className="mb-2 text-lg font-semibold text-flora-ink">
                            Subscription Required
                          </h3>
                          <p className="mb-4 text-sm text-flora-muted">
                            {sellerAccess.reason}
                          </p>
                          <button
                            type="button"
                            onClick={() => navigate('/dashboard')}
                            className={cn(BTN_PRIMARY, "w-full sm:w-auto")}
                          >
                            Renew Subscription
                          </button>
                        </div>
                      );
                    }

                    return orders.filter((order) => order.seller_id === user?.id).length === 0 ? (
                      <OrderEmptyState
                        title="No sales yet"
                        copy="Start selling to see your orders here"
                      />
                    ) : (
                      orders
                        .filter((order) => order.seller_id === user?.id)
                        .map((order) => renderOrderCard(order, true))
                    );
                  })()}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
        </main>
      </PullToRefresh>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        open={showOrderDetails}
        onClose={() => {
          setShowOrderDetails(false);
          setSelectedOrder(null);
        }}
        isSeller={activeTab === "seller"}
      />

      {/* Profile Review Modal */}
      {reviewOrderData && (
        <ProfileReviewModal
          open={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setReviewOrderData(null);
          }}
          sellerId={reviewOrderData.sellerId}
          sellerName={reviewOrderData.sellerName}
          orderId={reviewOrderData.orderId}
        />
      )}
    </div>
  );
};

export default Orders;
