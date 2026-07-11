import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  if (!order) return null;

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

  const escrow = order.escrow_transactions?.[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Order Details
            <Badge variant={getStatusVariant(order.status) as any} className="text-xs">
              <span className="flex items-center gap-1">
                {getStatusIcon(order.status)}
                {order.status}
              </span>
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono">#{order.id.slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product:</span>
                  <span className="font-medium">{order.product?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Quantity:</span>
                  <span>{order.quantity}</span>
                </div>
                {order.selected_size && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      Size:
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {order.selected_size}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-semibold text-green-600">
                    ₦{order.total_amount.toLocaleString()}
                  </span>
                </div>
                {isSeller && escrow && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">You'll receive:</span>
                    <span className="font-semibold text-green-600">
                      ₦{escrow.seller_amount.toLocaleString()}
                    </span>
                  </div>
                )}
                {order.payment_method && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      Payment Method:
                    </span>
                    <span className="capitalize">{order.payment_method}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">
                    {isSeller ? "Buyer" : "Seller"}:
                  </p>
                  <p className="font-medium">
                    {isSeller ? order.buyer?.full_name : order.seller?.full_name}
                  </p>
                  {((isSeller && order.buyer?.phone_number) ||
                    (!isSeller && order.seller?.phone_number)) && (
                    <p className="flex items-center gap-1 text-muted-foreground mt-1">
                      <Phone className="h-3 w-3" />
                      {isSeller ? order.buyer?.phone_number : order.seller?.phone_number}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">You:</p>
                  <p className="font-medium">
                    {isSeller ? order.seller?.full_name : order.buyer?.full_name}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          {(order.shipping_address || order.delivery_method) && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  {order.delivery_method === "pickup" ? (
                    <Package className="h-4 w-4" />
                  ) : (
                    <Truck className="h-4 w-4" />
                  )}
                  {order.delivery_method === "pickup" ? "Pickup" : "Shipping Information"}
                </h3>
                <div className="text-sm space-y-2">
                  {order.delivery_method === "pickup" ? (
                    <p className="text-muted-foreground">
                      Buyer chose to pick this up from you directly — no delivery required.
                    </p>
                  ) : (
                    order.shipping_address && (
                      <div>
                        <p className="text-muted-foreground">Delivery Address:</p>
                        <p className="font-medium">{order.shipping_address}</p>
                      </div>
                    )
                  )}
                  {order.university_name && (
                    <div>
                      <p className="text-muted-foreground">University:</p>
                      <p className="font-medium text-blue-600">{order.university_name}</p>
                    </div>
                  )}
                  {order.tracking_info && (
                    <div>
                      <p className="text-muted-foreground">Tracking Info:</p>
                      <p className="font-medium">{order.tracking_info}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Timeline */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Order Timeline
              </h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order Placed:</span>
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                </div>
                {order.confirmed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confirmed:</span>
                    <span>{new Date(order.confirmed_at).toLocaleString()}</span>
                  </div>
                )}
                {escrow?.auto_release_at && order.status === "delivered" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto-confirm:</span>
                    <span className="text-orange-600">
                      {new Date(escrow.auto_release_at).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Escrow Protection */}
          {escrow && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Escrow Protection
                </h3>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Escrow Status:</span>
                    <Badge variant="outline" className="text-xs">
                      {escrow.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Protected Amount:</span>
                    <span className="font-semibold">
                      ₦{order.total_amount.toLocaleString()}
                    </span>
                  </div>
                  {order.escrow_released && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Status:</span>
                      <Badge variant="default" className="text-xs">
                        Released to Seller
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};