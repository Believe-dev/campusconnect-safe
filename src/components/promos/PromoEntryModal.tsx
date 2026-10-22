import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Zap } from "lucide-react";
import { ROUTES } from "@/lib/constants";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live";
  starts_at: string | null;
  banner_image_url: string | null;
}

const SEEN_KEY_PREFIX = "promo_modal_seen_";

// Mounted at the top level in App.tsx alongside ReconsentGate, same
// self-gating pattern (queries its own data, returns null when nothing to
// show) - but dismissible, since this is marketing, not a compliance gate.
export const PromoEntryModal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Prefer a live promo over an upcoming one so the modal always
      // surfaces the most actionable thing right now.
      const { data: live } = await supabase
        .from("promotions")
        .select("id, title, description, status, starts_at, banner_image_url")
        .eq("status", "live")
        .limit(1)
        .maybeSingle();

      const promo =
        live ||
        (
          await supabase
            .from("promotions")
            .select("id, title, description, status, starts_at, banner_image_url")
            .eq("status", "scheduled")
            .order("starts_at", { ascending: true })
            .limit(1)
            .maybeSingle()
        ).data;

      if (!promo) return;

      const seenKey = `${SEEN_KEY_PREFIX}${promo.id}`;
      if (localStorage.getItem(seenKey)) return;

      setPromotion(promo as Promotion);
      setOpen(true);
    };

    load();
  }, [user]);

  if (
    !promotion ||
    location.pathname.startsWith(ROUTES.promos) ||
    location.pathname === ROUTES.auth
  ) {
    return null;
  }

  const dismiss = () => {
    localStorage.setItem(`${SEEN_KEY_PREFIX}${promotion.id}`, "1");
    setOpen(false);
  };

  const handleRemindMe = async () => {
    if (user) {
      try {
        await supabase
          .from("promo_reminders")
          .insert({ promotion_id: promotion.id, user_id: user.id });
      } catch {
        // Non-critical - the Promos page itself still lets them set a
        // reminder, this is just a shortcut from the modal.
      }
    }
    dismiss();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent className="max-w-md overflow-hidden rounded-3xl p-0 text-center">
        {promotion.banner_image_url && (
          <img
            src={promotion.banner_image_url}
            alt={promotion.title}
            className="h-auto w-full"
          />
        )}
        <div className="p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-col items-center gap-3 text-flora-ink">
            {!promotion.banner_image_url && (
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-flora-chip text-flora-leaf">
                <Zap className="h-7 w-7" />
              </span>
            )}
            {promotion.status === "live"
              ? "It's live right now! ⚡"
              : "Special Promo Incoming! 🎉"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-lg font-bold text-flora-ink">
              {promotion.title}
            </p>
            {promotion.description && (
              <p className="mt-1 text-sm text-flora-muted">
                {promotion.description}
              </p>
            )}
          </div>

          {promotion.status === "scheduled" && promotion.starts_at && (
            <div className="rounded-2xl bg-flora-chip/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-flora-muted">
                Opens on
              </p>
              <p className="font-semibold text-flora-ink">
                {new Date(promotion.starts_at).toLocaleString()}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              dismiss();
              navigate(
                promotion.status === "live"
                  ? `${ROUTES.promos}/${promotion.id}`
                  : ROUTES.promos
              );
            }}
            className="w-full rounded-full bg-flora-ink py-3 text-sm font-semibold text-white transition hover:brightness-110"
          >
            {promotion.status === "live" ? "Enter Now" : "View Promos"}
          </button>
          <button
            type="button"
            onClick={promotion.status === "scheduled" ? handleRemindMe : dismiss}
            className="w-full text-sm font-medium text-flora-muted"
          >
            {promotion.status === "scheduled" ? "Remind Me" : "Maybe Later"}
          </button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoEntryModal;
