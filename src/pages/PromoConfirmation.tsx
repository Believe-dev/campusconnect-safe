import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { PartyPopper, Package } from "lucide-react";
import { ROUTES } from "@/lib/constants";

interface GrabSummary {
  id: string;
  quantity: number;
  title: string;
  price: number;
}

const PromoConfirmation = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [grabs, setGrabs] = useState<GrabSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("promo_grabs")
          .select(
            "id, quantity, shipping_address, promo_product:promo_products(custom_title, custom_price, product:products(title, price))"
          )
          .eq("promotion_id", id)
          .eq("user_id", user.id);
        if (error) throw error;

        type RawGrab = {
          id: string;
          quantity: number;
          shipping_address: string | null;
          promo_product: {
            custom_title: string | null;
            custom_price: number | null;
            product: { title: string; price: number } | null;
          } | null;
        };
        const rows = (data || []) as unknown as RawGrab[];
        setGrabs(
          rows.map((g) => ({
            id: g.id,
            quantity: g.quantity,
            title:
              g.promo_product?.product?.title ||
              g.promo_product?.custom_title ||
              "Item",
            price:
              g.promo_product?.product?.price ??
              g.promo_product?.custom_price ??
              0,
          }))
        );
        // If the buyer already submitted shipping details previously (e.g.
        // they refreshed this page), don't make them re-enter it.
        if (rows.length > 0 && rows.every((g) => g.shipping_address)) {
          setSubmitted(true);
        }
      } catch (error) {
        console.error("Error loading grab summary:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, user]);

  const handleSubmit = async (formData: FormData) => {
    const address = formData.get("shipping_address") as string;
    const phone = formData.get("contact_phone") as string;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc(
        "submit_promo_shipping_details",
        {
          p_promotion_id: id,
          p_shipping_address: address,
          p_contact_phone: phone,
        }
      );
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
      setSubmitted(true);
      toast.success("Shipping details saved - we'll pack and ship these!");
    } catch (error) {
      console.error("Error submitting shipping details:", error);
      toast.error("Failed to save shipping details");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-flora-ink" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <main className="mx-auto max-w-lg px-4 py-8 pb-24">
        <div className="mb-6 text-center">
          <PartyPopper className="mx-auto mb-3 h-12 w-12 text-flora-leaf" />
          <h1 className="text-2xl font-extrabold text-flora-ink">
            {grabs.length > 0 ? "Nice grab!" : "No items grabbed"}
          </h1>
          <p className="mt-1 text-sm text-flora-muted">
            {grabs.length > 0
              ? "No payment needed - we'll pack and deliver these to you."
              : "The timer ran out before you grabbed anything this time."}
          </p>
        </div>

        {grabs.length > 0 && (
          <div className="mb-6 rounded-3xl bg-flora-card p-5 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-flora-ink">
              What you grabbed
            </h2>
            <div className="space-y-3">
              {grabs.map((grab) => (
                <div
                  key={grab.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-flora-muted" />
                    <span className="text-sm text-flora-ink">
                      {grab.title}
                    </span>
                  </div>
                  <span className="text-sm text-flora-muted">
                    x{grab.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {grabs.length > 0 && !submitted && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(new FormData(e.currentTarget));
            }}
            className="space-y-4 rounded-3xl bg-flora-card p-5 shadow-card"
          >
            <h2 className="text-sm font-semibold text-flora-ink">
              Where should we send these?
            </h2>
            <div>
              <label className="mb-1 block text-sm font-medium text-flora-ink">
                Shipping Address *
              </label>
              <textarea
                name="shipping_address"
                required
                rows={3}
                placeholder="Hostel/block, room number, campus..."
                className="w-full rounded-2xl border border-flora-ink/15 p-3 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-flora-ink">
                Contact Phone
              </label>
              <input
                name="contact_phone"
                type="tel"
                placeholder="080..."
                className="w-full rounded-2xl border border-flora-ink/15 p-3 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-flora-ink py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Confirm Delivery Details"}
            </button>
          </form>
        )}

        {grabs.length > 0 && submitted && (
          <div className="rounded-3xl bg-flora-leaf/10 p-5 text-center">
            <p className="font-medium text-flora-leaf">
              Delivery details saved! We'll notify you once it ships.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate(ROUTES.promos)}
          className="mt-6 w-full rounded-full border border-flora-ink/15 bg-white py-3 text-sm font-medium text-flora-ink"
        >
          Back to Promos
        </button>
      </main>
    </div>
  );
};

export default PromoConfirmation;
