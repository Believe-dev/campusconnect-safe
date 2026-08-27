import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/enhanced-button";

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
    <Card className={sellers.length > 0 ? "border-amber-300" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className={`h-4 w-4 ${sellers.length > 0 ? "text-amber-500" : "text-muted-foreground"}`} />
          Unverified Sellers With Held Escrow
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : sellers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No unverified or rejected-KYC sellers currently have held escrow. Nothing at risk right now.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">{sellers.length}</strong> seller{sellers.length !== 1 ? "s" : ""} with{" "}
              <strong className="text-foreground">₦{totalHeld.toLocaleString()}</strong> in held escrow can't be paid out until
              they complete or resubmit identity verification.
            </p>
            <div className="space-y-2">
              {sellers.map((s) => (
                <div
                  key={s.user_id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.full_name || "Unknown seller"}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        s.kyc_status === "rejected"
                          ? "border-red-400 text-red-600"
                          : "border-amber-400 text-amber-600"
                      }
                    >
                      {s.kyc_status}
                    </Badge>
                    <div className="text-right">
                      <p className="font-semibold">₦{s.heldAmount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.heldOrders} order{s.heldOrders !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
