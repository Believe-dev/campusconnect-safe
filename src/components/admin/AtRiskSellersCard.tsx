import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface AtRiskSeller {
  user_id: string;
  full_name: string | null;
  email: string | null;
  kyc_status: string;
  heldAmount: number;
  heldOrders: number;
}

// Surfaces the exact risk scenario the payout KYC gate (anchor-withdraw)
// creates: a seller who has fulfilled orders (money sitting in held escrow)
// but can't withdraw it because they never finished BVN/NIN verification, or
// their verification was rejected. Flagging this here means admin sees it
// before it turns into a "why can't I get paid" support ticket.
export const AtRiskSellersCard = () => {
  const [sellers, setSellers] = useState<AtRiskSeller[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: heldEscrows, error: escrowError } = await supabase
        .from("escrow_transactions")
        .select("seller_id, seller_amount")
        .eq("status", "held");

      if (escrowError) throw escrowError;

      const heldBySeller = new Map<string, { amount: number; count: number }>();
      (heldEscrows || []).forEach((row: { seller_id: string; seller_amount: number }) => {
        const existing = heldBySeller.get(row.seller_id) || { amount: 0, count: 0 };
        existing.amount += Number(row.seller_amount) || 0;
        existing.count += 1;
        heldBySeller.set(row.seller_id, existing);
      });

      const sellerIds = [...heldBySeller.keys()];
      if (sellerIds.length === 0) {
        setSellers([]);
        return;
      }

      const { data: profiles, error: profileError } = await (supabase.from("profiles") as any)
        .select("user_id, full_name, email, kyc_status")
        .in("user_id", sellerIds)
        .in("kyc_status", ["unverified", "rejected"]);

      if (profileError) throw profileError;

      const atRisk: AtRiskSeller[] = (profiles || []).map((p: any) => {
        const held = heldBySeller.get(p.user_id)!;
        return {
          user_id: p.user_id,
          full_name: p.full_name,
          email: p.email,
          kyc_status: p.kyc_status || "unverified",
          heldAmount: held.amount,
          heldOrders: held.count,
        };
      });

      atRisk.sort((a, b) => b.heldAmount - a.heldAmount);
      setSellers(atRisk);
    } catch (error) {
      console.error("Error loading at-risk sellers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalHeld = sellers.reduce((sum, s) => sum + s.heldAmount, 0);

  return (
    <div
      className={`rounded-3xl bg-flora-card p-5 shadow-card sm:p-6 ${
        sellers.length > 0 ? "ring-1 ring-amber-300" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-flora-ink">
          <AlertTriangle
            className={`h-4 w-4 ${sellers.length > 0 ? "text-amber-500" : "text-flora-muted"}`}
          />
          Unverified Sellers With Held Escrow
        </h2>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          title="Refresh"
          className="inline-flex items-center justify-center rounded-full border border-flora-ink/15 bg-white p-2 text-flora-ink transition hover:bg-flora-chip disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-flora-muted">Loading...</p>
      ) : sellers.length === 0 ? (
        <p className="mt-3 text-sm text-flora-muted">
          No unverified or rejected-KYC sellers currently have held escrow. Nothing at risk right now.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-flora-muted">
            <strong className="text-flora-ink">{sellers.length}</strong> seller{sellers.length !== 1 ? "s" : ""} with{" "}
            <strong className="text-flora-ink">₦{totalHeld.toLocaleString()}</strong> in held escrow can't be paid out until
            they complete or resubmit identity verification.
          </p>
          <div className="space-y-2">
            {sellers.map((s) => (
              <div
                key={s.user_id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-flora-ink/10 p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-flora-ink">{s.full_name || "Unknown seller"}</p>
                  <p className="truncate text-xs text-flora-muted">{s.email}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.kyc_status === "rejected"
                        ? "bg-red-100 text-red-600"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {s.kyc_status}
                  </span>
                  <div className="text-right">
                    <p className="font-semibold text-flora-ink">₦{s.heldAmount.toLocaleString()}</p>
                    <p className="text-xs text-flora-muted">
                      {s.heldOrders} order{s.heldOrders !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
