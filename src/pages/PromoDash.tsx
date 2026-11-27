import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, Check, Zap } from "lucide-react";
import { ROUTES } from "@/lib/constants";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  duration_seconds: number;
  status: string;
}

interface DashProduct {
  id: string; // promo_product id, what grab_promo_item takes
  product_id: string | null;
  title: string;
  price: number;
  image: string | null;
}

type Phase = "loading" | "not_live" | "ready" | "active" | "done";

const PromoDash = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading");
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [products, setProducts] = useState<DashProduct[]>([]);
  const [grabbedIds, setGrabbedIds] = useState<Set<string>>(new Set());
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // useAuth() is a fresh hook instance on every mount, so `user` starts
    // out null until its own session check resolves - bail out here
    // without redirecting yet, or a logged-in user gets bounced to /auth
    // (which then bounces them again, to "/") before their session loads.
    if (authLoading) return;
    if (!user) {
      navigate(ROUTES.auth);
      return;
    }
    if (!id) return;

    const load = async () => {
      try {
        const { data: promo, error: promoError } = await supabase
          .from("promotions")
          .select("id, title, description, duration_seconds, status")
          .eq("id", id)
          .single();
        if (promoError || !promo) throw promoError || new Error("Not found");

        if (promo.status !== "live") {
          setPromotion(promo as Promotion);
          setPhase("not_live");
          return;
        }

        const { data: promoProducts, error: ppError } = await supabase
          .from("promo_products")
          .select(
            "id, product_id, custom_title, custom_price, custom_image_url, product:products(title, price, images)"
          )
          .eq("promotion_id", id);
        if (ppError) throw ppError;

        type RawPromoProduct = {
          id: string;
          product_id: string | null;
          custom_title: string | null;
          custom_price: number | null;
          custom_image_url: string | null;
          product: { title: string; price: number; images: string[] } | null;
        };
        setProducts(
          ((promoProducts || []) as unknown as RawPromoProduct[]).map((pp) => ({
            id: pp.id,
            product_id: pp.product_id,
            title: pp.product?.title || pp.custom_title || "Item",
            price: pp.product?.price ?? pp.custom_price ?? 0,
            image: pp.product?.images?.[0] || pp.custom_image_url || null,
          }))
        );
        setPromotion(promo as Promotion);
        setPhase("ready");
      } catch (error) {
        console.error("Error loading promo dash:", error);
        toast.error("Couldn't load this promotion");
        navigate(ROUTES.promos);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id, authLoading]);

  const startDash = () => {
    if (!promotion) return;
    setSecondsLeft(promotion.duration_seconds);
    setPhase("active");
  };

  useEffect(() => {
    if (phase !== "active") return;

    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setPhase("done");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === "done") {
      const timeout = setTimeout(() => {
        navigate(`${ROUTES.promos}/${id}/confirmation`);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [phase, id, navigate]);

  const handleGrab = async (promoProductId: string) => {
    if (phase !== "active" || grabbedIds.has(promoProductId)) return;
    setPendingIds((prev) => new Set(prev).add(promoProductId));
    try {
      const { data, error } = await supabase.rpc("grab_promo_item", {
        p_promotion_id: id,
        p_promo_product_id: promoProductId,
        p_quantity: 1,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (result.success) {
        setGrabbedIds((prev) => new Set(prev).add(promoProductId));
      } else {
        toast.error(result.error || "Couldn't grab that item");
      }
    } catch (error) {
      console.error("Error grabbing item:", error);
      toast.error("Couldn't grab that item");
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(promoProductId);
        return next;
      });
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-flora-ink" />
      </div>
    );
  }

  if (phase === "not_live") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <Zap className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
          <h1 className="mb-2 text-xl font-bold text-flora-ink">
            {promotion?.status === "ended"
              ? "This promo has ended"
              : "This promo isn't live yet"}
          </h1>
          <p className="mb-6 text-flora-muted">
            {promotion?.status === "scheduled"
              ? "Check the Upcoming tab and set a reminder so you don't miss it."
              : "Check the Promos page for what's live right now."}
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.promos)}
            className="rounded-full bg-flora-ink px-6 py-3 text-sm font-semibold text-white"
          >
            Back to Promos
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(ROUTES.promos)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-flora-ink/15 bg-white text-flora-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-xl font-bold text-flora-ink">
            {promotion?.title}
          </h1>
        </div>

        {phase === "ready" && (
          <div className="rounded-3xl bg-flora-card p-6 text-center shadow-card">
            <Zap className="mx-auto mb-4 h-12 w-12 text-flora-leaf" />
            <h2 className="mb-2 text-lg font-bold text-flora-ink">
              Ready? You'll have {promotion?.duration_seconds} seconds!
            </h2>
            <p className="mb-6 text-sm text-flora-muted">
              Tap as many items as you can grab before the timer runs out.
              Every grab is free - we'll ship what you get.
            </p>
            <button
              type="button"
              onClick={startDash}
              className="w-full rounded-full bg-flora-ink py-4 text-base font-bold text-white transition hover:brightness-110"
            >
              Start My Dash
            </button>
          </div>
        )}

        {(phase === "active" || phase === "done") && (
          <>
            <div className="mb-4 flex items-center justify-center">
              <div
                className={`flex h-24 w-24 items-center justify-center rounded-full border-4 text-3xl font-black ${
                  secondsLeft <= 1
                    ? "border-red-500 text-red-600"
                    : "border-flora-ink text-flora-ink"
                }`}
              >
                {phase === "done" ? "⏱" : secondsLeft}
              </div>
            </div>
            {phase === "done" && (
              <p className="mb-4 text-center font-semibold text-flora-ink">
                Time's up! You grabbed {grabbedIds.size} item
                {grabbedIds.size === 1 ? "" : "s"}. Redirecting...
              </p>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {products.map((product) => {
                const isGrabbed = grabbedIds.has(product.id);
                const isPending = pendingIds.has(product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={phase !== "active" || isGrabbed || isPending}
                    onClick={() => handleGrab(product.id)}
                    className={`relative overflow-hidden rounded-2xl border-2 p-2 text-left transition ${
                      isGrabbed
                        ? "border-flora-leaf bg-flora-leaf/10"
                        : "border-flora-ink/10 bg-white active:scale-95"
                    }`}
                  >
                    <div className="aspect-square w-full overflow-hidden rounded-xl bg-flora-chip">
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <p className="mt-2 truncate text-xs font-medium text-flora-ink">
                      {product.title}
                    </p>
                    <p className="text-xs text-flora-muted">
                      ₦{product.price.toLocaleString()}
                    </p>
                    {isGrabbed && (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-flora-leaf text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default PromoDash;
