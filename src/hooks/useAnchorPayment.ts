import { useCallback } from "react";
import { initiateSellerPayment, verifySellerPayment } from "@/services/anchorBaasService";

// Real Anchor NUBAN-transfer collection for the seller registration fee /
// monthly renewal, replacing the old usePaystack hook (which had been
// disabled - it dispatched a "transfer" with no payment instrument ever
// collected and unconditionally reported success). initiatePayment creates a
// dedicated Sub-Ledger account server-side; verifyPayment asks the server to
// check Anchor for a matching deposit. Neither step lets the client declare
// success on its own.
export function useAnchorPayment() {
  const initiatePayment = useCallback((purpose: "registration" | "renewal") => {
    return initiateSellerPayment(purpose);
  }, []);

  const verifyPayment = useCallback((intentId: string) => {
    return verifySellerPayment(intentId);
  }, []);

  return {
    initiatePayment,
    verifyPayment,
  };
}
