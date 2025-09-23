import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lock, Shield, Info } from 'lucide-react';
import { CartItem } from '@/lib/types';
import { BUSINESS_RULES } from '@/lib/constants';
import { OptimizedImage } from '@/components/common/OptimizedImage';

interface OrderSummaryProps {
  cartItems: CartItem[];
  onSubmit: () => void;
  processing: boolean;
}

export const OrderSummary: React.FC<OrderSummaryProps> = ({
  cartItems,
  onSubmit,
  processing,
}) => {
  const getTotalPrice = () => {
    return cartItems.reduce(
      (total, item) => total + item.products.price * item.quantity,
      0
    );
  };

  const getDeliveryFee = () => {
    return BUSINESS_RULES.delivery.flatRate;
  };

  const getFinalTotal = () => {
    return getTotalPrice() + getDeliveryFee();
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {cartItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              {item.products.images && item.products.images[0] && (
                <OptimizedImage
                  src={item.products.images[0]}
                  alt={item.products.title}
                  width={48}
                  height={48}
                  className="w-12 h-12 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h4 className="font-medium text-sm line-clamp-1">
                  {item.products.title}
                </h4>
                <p className="text-xs text-muted-foreground">
                  by {(item.products as any).profiles?.full_name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    Qty: {item.quantity}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">
                  ₦{(item.products.price * item.quantity).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>₦{getTotalPrice().toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Delivery</span>
            <span>₦{getDeliveryFee().toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
            <Info className="h-3 w-3" />
            <span>Platform fee ({(BUSINESS_RULES.commission.rate * 100)}%) deducted from seller</span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>₦{getFinalTotal().toLocaleString()}</span>
        </div>

        <Button
          onClick={onSubmit}
          variant="default"
          className="w-full"
          disabled={processing}
        >
          {processing ? (
            <>Processing...</>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Pay with Paystack
            </>
          )}
        </Button>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-1 text-xs text-green-600">
            <Shield className="h-3 w-3" />
            <span>Protected by Escrow System</span>
          </div>
          <div className="text-xs text-muted-foreground text-center">
            <Lock className="h-3 w-3 inline mr-1" />
            Your payment is held securely until you confirm receipt
          </div>
        </div>
      </CardContent>
    </Card>
  );
};