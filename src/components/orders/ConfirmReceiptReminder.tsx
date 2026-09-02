import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PackageCheck } from "lucide-react";
import type { UnconfirmedOrder } from "@/hooks/useConfirmReceiptReminder";

interface ConfirmReceiptReminderProps {
  open: boolean;
  orders: UnconfirmedOrder[];
  onDismiss: () => void;
}

export const ConfirmReceiptReminder = ({
  open,
  orders,
  onDismiss,
}: ConfirmReceiptReminderProps) => {
  const navigate = useNavigate();

  const handleReview = () => {
    onDismiss();
    navigate("/orders");
  };

  const first = orders[0];
  const extraCount = orders.length - 1;

  // Dialog's children still render even while `open` is false (or before
  // the hook's first check completes), so this can mount with an empty
  // `orders` array — bail out rather than dereferencing `first` below.
  if (!first) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DialogContent className="max-w-sm border-flora-ink/10 bg-flora-card text-flora-ink">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-flora-ink">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flora-tagBg text-flora-tagText">
              <PackageCheck className="h-4 w-4" />
            </span>
            Confirm you got it
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-flora-muted">
            {orders.length === 1 ? (
              <>
                <span className="font-medium text-flora-ink">{first.product_title}</span> was
                marked delivered. Confirm receipt to release payment to the seller.
              </>
            ) : (
              <>
                You have{" "}
                <span className="font-medium text-flora-ink">{orders.length} delivered orders</span>{" "}
                waiting for confirmation, starting with{" "}
                <span className="font-medium text-flora-ink">{first.product_title}</span>
                {extraCount > 0 ? ` and ${extraCount} more` : ""}.
              </>
            )}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 rounded-full border border-flora-ink/15 bg-white px-4 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
            >
              Remind me later
            </button>
            <button
              type="button"
              onClick={handleReview}
              className="flex-1 rounded-full bg-flora-ink px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
            >
              Review & Confirm
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmReceiptReminder;
