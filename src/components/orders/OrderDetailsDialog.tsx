import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Package,
  Truck,
  CheckCircle,
  AlertCircle,
  Clock,
  Shield,
  Calendar,
  User,
  Phone,
  CreditCard,
  Ruler,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { approveSellerEscrow } from "@/services/anchorBaasService";
import { useState } from "react";

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

const STATUS_TONE: Record<string, string> = {
  pending: "bg-flora-chip text-flora-muted",
  paid: "bg-flora-tagBg text-flora-tagText",
  shipped: "bg-flora-chip text-flora-ink",
  delivered: "bg-flora-tagBg text-flora-tagText",
  confirmed: "bg-flora-leaf text-white",
  disputed: "bg-red-50 text-red-600",
};

// The order lifecycle is a fixed, linear pipeline, so the timeline renders
// as a connected stepper (reached stages filled, the connecting line
// filled up to the current stage) rather than a flat list of key/value
// rows. Only "pending" and "confirmed" have real stored timestamps
// (created_at / confirmed_at) — paid/shipped/delivered show as reached
// without a fabricated date.
const ORDER_TIMELINE_STAGES = [
  { key: "pending", label: "Order Placed" },
  { key: "paid", label: "Payment Received" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "confirmed", label: "Confirmed" },
];

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  isSeller?: boolean;
}

export const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  order,
  open,
  onClose,
  isSeller = false,
}) => {
  const [approving, setApproving] = useState(false);
  const { toast } = useToast();

  if (!order) return null;

  const handleApproveEscrow = async () => {
    if (!order || approving) return;
    try {
      setApproving(true);
      const res = await approveSellerEscrow(order.id);
      if (res.success) {
        toast({
          title: "Anchor Funds Unlocked! 🎉",
          description: res.message,
        });
        onClose();
        window.location.reload();
      } else {
        toast({
          title: "Error",
          description: res.message,
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("Failed to approve escrow:", err);
      toast({
        title: "Error",
        description: "Something went wrong releasing this payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
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

  const escrow = order.escrow_transactions?.[0];

  const Section = ({
    icon: Icon,
    title,
    children,
  }: {
    icon: typeof Package;
    title: string;
    children: React.ReactNode;
  }) => (
    <div className="rounded-2xl border border-flora-ink/10 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-flora-ink">
        <Icon className="h-4 w-4 text-flora-leaf" />
        {title}
      </h3>
      <div className="space-y-2 text-sm">{children}</div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-flora-ink/10 bg-flora-card text-flora-ink">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-flora-ink">
            Order Details
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
                STATUS_TONE[order.status] || "bg-flora-chip text-flora-muted"
              )}
            >
              {getStatusIcon(order.status)}
              {order.status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Section icon={Package} title="Order Summary">
            <div className="flex justify-between">
              <span className="text-flora-muted">Order ID:</span>
              <span className="font-mono">#{order.id.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-flora-muted">Product:</span>
              <span className="font-medium">{order.product?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-flora-muted">Quantity:</span>
              <span>{order.quantity}</span>
            </div>
            {order.selected_size && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-flora-muted">
                  <Ruler className="h-3 w-3" />
                  Size:
                </span>
                <span className="rounded-full border border-flora-ink/15 px-2 py-0.5 text-xs">
                  {order.selected_size}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-flora-muted">Total Amount:</span>
              <span className="font-semibold text-flora-leaf">
                ₦{order.total_amount.toLocaleString()}
              </span>
            </div>
            {isSeller && escrow && (
              <div className="flex justify-between">
                <span className="text-flora-muted">You'll receive:</span>
                <span className="font-semibold text-flora-leaf">
                  ₦{escrow.seller_amount.toLocaleString()}
                </span>
              </div>
            )}
            {order.payment_method && (
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-flora-muted">
                  <CreditCard className="h-3 w-3" />
                  Payment Method:
                </span>
                <span className="capitalize">{order.payment_method}</span>
              </div>
            )}
          </Section>

          <Section icon={User} title="Contact Information">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-1 text-flora-muted">
                  {isSeller ? "Buyer" : "Seller"}:
                </p>
                <p className="font-medium">
                  {isSeller ? order.buyer?.full_name : order.seller?.full_name}
                </p>
                {((isSeller && order.buyer?.phone_number) ||
                  (!isSeller && order.seller?.phone_number)) && (
                  <p className="mt-1 flex items-center gap-1 text-flora-muted">
                    <Phone className="h-3 w-3" />
                    {isSeller ? order.buyer?.phone_number : order.seller?.phone_number}
                  </p>
                )}
              </div>
              <div>
                <p className="mb-1 text-flora-muted">You:</p>
                <p className="font-medium">
                  {isSeller ? order.seller?.full_name : order.buyer?.full_name}
                </p>
              </div>
            </div>
          </Section>

          {(order.shipping_address || order.delivery_method) && (
            <Section
              icon={order.delivery_method === "pickup" ? Package : Truck}
              title={order.delivery_method === "pickup" ? "Pickup" : "Shipping Information"}
            >
              {order.delivery_method === "pickup" ? (
                <p className="text-flora-muted">
                  Buyer chose to pick this up from you directly — no delivery required.
                </p>
              ) : (
                order.shipping_address && (
                  <div>
                    <p className="text-flora-muted">Delivery Address:</p>
                    <p className="font-medium">{order.shipping_address}</p>
                  </div>
                )
              )}
              {order.university_name && (
                <div>
                  <p className="text-flora-muted">University:</p>
                  <p className="font-medium text-flora-leaf">{order.university_name}</p>
                </div>
              )}
              {order.tracking_info && (
                <div>
                  <p className="text-flora-muted">Tracking Info:</p>
                  <p className="font-medium">{order.tracking_info}</p>
                </div>
              )}
            </Section>
          )}

          <Section icon={Calendar} title="Order Timeline">
            {order.status === "disputed" ? (
              <p className="text-red-600">
                This order is under dispute — the normal timeline is paused.
              </p>
            ) : (
              <div>
                {ORDER_TIMELINE_STAGES.map((stage, i) => {
                  const currentIndex = ORDER_TIMELINE_STAGES.findIndex((s) => s.key === order.status);
                  const reached = i <= currentIndex;
                  const passed = i < currentIndex;
                  const isLast = i === ORDER_TIMELINE_STAGES.length - 1;
                  const date =
                    stage.key === "pending"
                      ? order.created_at
                      : stage.key === "confirmed"
                      ? order.confirmed_at
                      : undefined;
                  return (
                    <div key={stage.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={cn(
                            "h-2.5 w-2.5 shrink-0 rounded-full",
                            reached ? "bg-flora-leaf" : "border border-flora-ink/20 bg-flora-chip"
                          )}
                        />
                        {!isLast && (
                          <span
                            className={cn("w-px flex-1", passed ? "bg-flora-leaf" : "bg-flora-ink/10")}
                          />
                        )}
                      </div>
                      <div className={cn("min-w-0", isLast ? "pb-0" : "pb-4")}>
                        <p className={cn("text-sm font-medium", reached ? "text-flora-ink" : "text-flora-muted")}>
                          {stage.label}
                        </p>
                        {date && (
                          <p className="text-xs text-flora-muted">{new Date(date).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {escrow?.auto_release_at && order.status === "delivered" && (
              <div className="mt-3 flex justify-between border-t border-flora-ink/10 pt-3">
                <span className="text-flora-muted">Auto-confirm:</span>
                <span className="text-amber-600">
                  {new Date(escrow.auto_release_at).toLocaleString()}
                </span>
              </div>
            )}
          </Section>

          {escrow && (
            <Section icon={Shield} title="Escrow Protection">
              <div className="flex justify-between">
                <span className="text-flora-muted">Escrow Status:</span>
                <span className="rounded-full border border-flora-ink/15 px-2 py-0.5 text-xs capitalize">
                  {escrow.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-flora-muted">Protected Amount:</span>
                <span className="font-semibold">
                  ₦{order.total_amount.toLocaleString()}
                </span>
              </div>
              {order.escrow_released && (
                <div className="flex justify-between">
                  <span className="text-flora-muted">Payment Status:</span>
                  <span className="rounded-full bg-flora-tagBg px-2 py-0.5 text-xs font-medium text-flora-tagText">
                    Released to Seller
                  </span>
                </div>
              )}
            </Section>
          )}

          {/* Releasing escrow is the BUYER confirming receipt, not the seller approving
              their own payout - the seller has no way to trigger this (also enforced
              server-side in anchor-escrow-resolve, which only accepts the release
              action from the order's buyer or an admin). */}
          {!isSeller && (order.status === "paid" || order.status === "shipped" || order.status === "delivered") && (
            <button
              type="button"
              onClick={handleApproveEscrow}
              disabled={approving}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-flora-leaf py-3 font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              {approving ? "Releasing Funds..." : "Confirm Receipt & Release Payment to Seller"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};