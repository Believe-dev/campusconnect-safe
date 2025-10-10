import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOptimizedQuery } from "@/hooks/useOptimizedQuery";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { useAuth } from "@/hooks/useAuth";
import { useRealTimeOrders } from "@/hooks/useRealTimeOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
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
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  commission_amount: number;
  status: string;
  payment_method?: string;
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

const Orders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("buyer");
  const [profile, setProfile] = useState<any>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const { toast } = useToast();
  useRealTimeOrders();
  usePullToRefresh(); // Enable pull-to-refresh
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
    refetchIntervalInBackground: true, // Continue refetching when tab is not active
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

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
        (payload) => {
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
            
            // Silently refetch in background
            refetch();
            setLastUpdated(new Date());
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
        (payload) => {
          // Refetch when escrow status changes
          refetch();
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
        (payload) => {
          // Refetch when disputes are created/updated
          refetch();
          setLastUpdated(new Date());
        }
      )
      .subscribe((status) => {
        setIsRealTimeConnected(status === 'SUBSCRIBED');
      });

    // Also listen for window focus to refresh data
    const handleFocus = () => {
      refetch();
      setLastUpdated(new Date());
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, refetch]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load orders",
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
      setOfflineOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { 
                ...order, 
                status, 
                ...(trackingInfo && { tracking_info: trackingInfo })
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
        refetch();
        throw error;
      }

      // Handle escrow release for confirmed orders
      if (status === "confirmed") {
        try {
          // Get escrow transaction ID from the order
          const order = orders.find((o) => o.id === orderId);
          const escrowId = order?.escrow_transactions?.[0]?.id;

          if (escrowId) {
            // Ensure seller has a wallet first
            const { error: walletError } = await supabase
              .from("wallets")
              .upsert(
                { user_id: order.seller_id },
                { onConflict: "user_id", ignoreDuplicates: true }
              );

            if (walletError) {
              console.error("Wallet creation error:", walletError);
            }

            // Now release escrow funds
            const { error: escrowError } = await supabase.rpc(
              "release_escrow_funds",
              {
                escrow_id: escrowId,
              }
            );

            if (escrowError) {
              console.error("Escrow release error:", escrowError);
              toast({
                title: "Payment Processing",
                description: "Order confirmed. Payment processing may take a few minutes.",
                variant: "default",
              });
            }
          }
        } catch (escrowError) {
          console.error("Escrow handling error:", escrowError);
          // Continue with order confirmation even if escrow fails
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
                ? "Order Shipped - CampusConnect"
                : "Order Delivered - CampusConnect";

            // Create notification
            const { sendOrderNotification } = await import('@/utils/notificationService');
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
                    <p>Best regards,<br>CampusConnect Team</p>
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

      // Real-time subscription will handle UI updates automatically
    } catch (error) {
      // Revert optimistic update on error
      refetch();
      toast({
        title: "Error",
        description: error?.message || "Failed to update order",
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
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        toast({
          title: "Error",
          description: "Order not found",
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
          title: "Error",
          description: "User profile not found. Please refresh and try again.",
          variant: "destructive",
        });
        return;
      }

      // Get escrow transaction ID for the order
      const escrowTransaction = order.escrow_transactions?.[0];
      if (!escrowTransaction) {
        toast({
          title: "Error",
          description: "No escrow transaction found for this order",
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
        title: "Error",
        description:
          error?.message || "Failed to report issue. Please try again.",
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
          title: "Error",
          description: "No open dispute found for this order",
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
          title: "Error",
          description:
            "Failed to withdraw dispute - you may not have permission",
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
        title: "Error",
        description: "Failed to withdraw dispute",
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary";
      case "shipped":
        return "outline";
      case "delivered":
        return "default";
      case "confirmed":
        return "default";
      case "disputed":
        return "destructive";
      default:
        return "secondary";
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

  // Count unattended orders
  const getUnattendedBuyerCount = () => {
    return orders.filter(
      (order) => 
        order.buyer_id === user?.id && 
        order.status === "delivered"
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
          `/messages?conversation=${conversationId}&draft=${encodeURIComponent(
            draftMessage
          )}`
        );
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start conversation",
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
      <Card 
        key={order.id} 
        className={`mb-3 sm:mb-4 transition-all duration-500 ${
          updatingOrderId === order.id 
            ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50/50' 
            : ''
        }`}
      >
        <CardContent className="p-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-2">
                  {order.product?.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant={getStatusVariant(order.status) as any}
                    className="text-xs"
                  >
                    <span className="flex items-center gap-1">
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                  </Badge>
                  {escrow && escrow.status === "held" && (
                    <Badge variant="outline" className="text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Escrow Protected</span>
                      <span className="sm:hidden">Protected</span>
                    </Badge>
                  )}
                </div>
              </div>

              <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <p className="truncate">
                  {isSeller ? (
                    `Buyer: ${order.buyer?.full_name}`
                  ) : (
                    <span>
                      Seller:
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/seller/${order.seller_id}`);
                        }}
                        className="text-blue-600 hover:text-blue-800 underline ml-1"
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
              <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                <p>
                  Qty: {order.quantity} • Total: ₦
                  {order.total_amount.toLocaleString()}
                </p>
                {isSeller && escrow && (
                  <p className="text-green-600 text-xs">
                    You'll receive: ₦{escrow.seller_amount.toLocaleString()}
                  </p>
                )}
                {isSeller && order.shipping_address && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                    <p className="font-medium text-primary">
                      📍 Shipping Details:
                    </p>
                    <p>{order.shipping_address}</p>
                    {order.university_name && (
                      <p className="text-blue-600">
                        🏫 {order.university_name}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Ordered on {new Date(order.created_at).toLocaleDateString()}
              </p>

              {order.tracking_info && (
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  📦 Tracking: {order.tracking_info}
                </p>
              )}

              {daysUntilAutoRelease &&
                daysUntilAutoRelease > 0 &&
                order.status === "delivered" && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
                    <Timer className="h-3 w-3" />
                    Auto-confirms in {daysUntilAutoRelease} day
                    {daysUntilAutoRelease !== 1 ? "s" : ""}
                  </div>
                )}
            </div>

            <div className="flex flex-col gap-2 w-full sm:w-auto">
              {/* Chat Button - Always visible */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleChat(order, isSeller)}
                className="w-full sm:w-auto text-xs sm:text-sm"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                {isSeller ? "Chat Buyer" : "Chat Seller"}
              </Button>

              {/* WhatsApp Button */}
              {((isSeller && order.buyer?.phone_number) ||
                (!isSeller && order.seller?.phone_number)) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleWhatsApp(order, isSeller)}
                  className="w-full sm:w-auto text-xs sm:text-sm bg-green-50 hover:bg-green-100 hover:text-green-600 text-green-700 border-green-200"
                >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  WhatsApp
                </Button>
              )}

              {isSeller ? (
                // Seller actions
                <>
                  {order.status === "paid" && (
                    <Button
                      size="sm"
                      onClick={() =>
                        updateOrderStatus(
                          order.id,
                          "shipped",
                          "Package dispatched"
                        )
                      }
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Mark as Shipped
                    </Button>
                  )}
                  {order.status === "shipped" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateOrderStatus(order.id, "delivered")}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Mark as Delivered
                    </Button>
                  )}
                  {order.status === "confirmed" && order.escrow_released && (
                    <Badge variant="default" className="text-center text-xs">
                      Payment Released
                    </Badge>
                  )}
                </>
              ) : (
                // Buyer actions
                <>
                  {order.status === "delivered" && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
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
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        ✅ Confirm Receipt
                      </Button>
                      <Dialog
                        open={showReportDialog}
                        onOpenChange={setShowReportDialog}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto text-xs sm:text-sm"
                          >
                            ❌ Report Issue
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[95vw] max-w-md">
                          <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl">
                              Report Issue
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-3 sm:space-y-4">
                            <div>
                              <Label
                                htmlFor="reason"
                                className="text-sm sm:text-base"
                              >
                                Reason
                              </Label>
                              <select
                                className="w-full p-2 border rounded text-sm sm:text-base"
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
                                className="text-sm sm:text-base"
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
                                className="text-sm sm:text-base"
                              />
                            </div>
                            <div className="flex flex-col gap-3">
                              <Button
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
                                className="w-full"
                                disabled={!reportReason || !reportDescription}
                              >
                                Submit Report
                              </Button>
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-2">
                                  Need immediate help?
                                </p>
                                <Button
                                  variant="outline"
                                  size="sm"
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
                                  className="text-green-600 hover:text-green-600 border-green-600 hover:bg-green-50"
                                >
                                  Chat on WhatsApp
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  )}
                  {order.status === "disputed" && (
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => withdrawDispute(order.id)}
                        className="w-full sm:w-auto text-xs sm:text-sm"
                      >
                        Withdraw Dispute
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-primary">
              My Orders
            </h1>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  refetch();
                  setLastUpdated(new Date());
                }}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Reload</span>
              </Button>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <div className={`w-2 h-2 rounded-full ${
                  isRealTimeConnected ? 'bg-green-500' : 'bg-gray-400'
                }`} />
                <span className="hidden sm:inline">
                  {isRealTimeConnected ? 'Live updates' : 'Connecting...'}
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
                <Card>
                  <CardContent className="p-6 sm:pt-6 text-center">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                    <p className="text-base sm:text-lg font-medium">
                      No orders yet
                    </p>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Start shopping to see your orders here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                orders
                  .filter((order) => order.buyer_id === user?.id)
                  .map((order) => renderOrderCard(order, false))
              )}
            </div>
          ) : (
            // Seller view with tabs
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 h-fit">
                <TabsTrigger value="buyer" className="relative">
                  As Buyer
                  {getUnattendedBuyerCount() > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                    >
                      {getUnattendedBuyerCount()}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="seller" className="relative">
                  As Seller
                  {getUnattendedSellerCount() > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center"
                    >
                      {getUnattendedSellerCount()}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="buyer" className="mt-6">
                <div>
                  {orders.filter((order) => order.buyer_id === user?.id)
                    .length === 0 ? (
                    <Card>
                      <CardContent className="p-6 sm:pt-6 text-center">
                        <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                        <p className="text-base sm:text-lg font-medium">
                          No orders yet
                        </p>
                        <p className="text-sm sm:text-base text-muted-foreground">
                          Start shopping to see your orders here
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    orders
                      .filter((order) => order.buyer_id === user?.id)
                      .map((order) => renderOrderCard(order, false))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="seller" className="mt-6">
                <div>
                  {orders.filter((order) => order.seller_id === user?.id)
                    .length === 0 ? (
                    <Card>
                      <CardContent className="p-6 sm:pt-6 text-center">
                        <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                        <p className="text-base sm:text-lg font-medium">
                          No sales yet
                        </p>
                        <p className="text-sm sm:text-base text-muted-foreground">
                          Start selling to see your orders here
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    orders
                      .filter((order) => order.seller_id === user?.id)
                      .map((order) => renderOrderCard(order, true))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </main>

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
