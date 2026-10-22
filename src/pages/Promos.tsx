import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCountdown } from "@/hooks/useCountdown";
import { toast } from "sonner";
import { ArrowLeft, Bell, BellRing, Zap, Package } from "lucide-react";
import { ROUTES } from "@/lib/constants";

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended";
  starts_at: string | null;
  ends_at: string | null;
  banner_image_url: string | null;
}

type ViewTab = "upcoming" | "live" | "past";

const PromoCountdownBadge = ({
  targetIso,
  prefix,
}: {
  targetIso: string | null;
  prefix: string;
}) => {
  const { formatted, isPast } = useCountdown(targetIso);
  if (!targetIso || isPast) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-flora-chip px-3 py-1 text-xs font-semibold text-flora-ink">
      {prefix} {formatted}
    </span>
  );
};

const PromoCard = ({
  promotion,
  productCount,
  hasReminder,
  onToggleReminder,
}: {
  promotion: Promotion;
  productCount: number;
  hasReminder: boolean;
  onToggleReminder: (promotionId: string) => void;
}) => {
  const navigate = useNavigate();
  const isLive = promotion.status === "live";

  return (
    <div
      onClick={
        isLive ? () => navigate(`${ROUTES.promos}/${promotion.id}`) : undefined
      }
      className={`overflow-hidden rounded-3xl bg-flora-card shadow-card ${
        isLive ? "cursor-pointer" : ""
      }`}
    >
      {promotion.banner_image_url && (
        <img
          src={promotion.banner_image_url}
          alt={promotion.title}
          className="h-auto w-full"
        />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            {promotion.status === "live" && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-red-600">
                Live Now
              </span>
            )}
            {promotion.status === "scheduled" && (
              <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-700">
                Upcoming
              </span>
            )}
            <h3 className="text-lg font-bold text-flora-ink">
              {promotion.title}
            </h3>
            {promotion.description && (
              <p className="mt-1 text-sm text-flora-muted">
                {promotion.description}
              </p>
            )}
          </div>
          {!promotion.banner_image_url && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flora-chip text-flora-ink">
              <Zap className="h-5 w-5" />
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {promotion.status === "scheduled" && promotion.starts_at && (
            <span className="text-sm text-flora-muted">
              Opens on {new Date(promotion.starts_at).toLocaleString()}
            </span>
          )}
          {promotion.status === "live" && (
            <PromoCountdownBadge
              targetIso={promotion.ends_at}
              prefix="Ends in"
            />
          )}
          {promotion.status === "ended" && promotion.ends_at && (
            <span className="text-sm text-flora-muted">
              Ended {new Date(promotion.ends_at).toLocaleDateString()}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-sm text-flora-muted">
            <Package className="h-3.5 w-3.5" />
            {productCount} item{productCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-4">
          {promotion.status === "live" && (
            <button
              type="button"
              onClick={() => navigate(`${ROUTES.promos}/${promotion.id}`)}
              className="w-full rounded-full bg-flora-ink py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Enter Now
            </button>
          )}
          {promotion.status === "scheduled" && (
            <button
              type="button"
              onClick={() => onToggleReminder(promotion.id)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition ${
                hasReminder
                  ? "bg-flora-leaf/15 text-flora-leaf"
                  : "border border-flora-ink/15 bg-white text-flora-ink hover:bg-flora-chip"
              }`}
            >
              {hasReminder ? (
                <BellRing className="h-4 w-4" />
              ) : (
                <Bell className="h-4 w-4" />
              )}
              {hasReminder ? "Reminder Set" : "Set Reminder"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Promos = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ViewTab>("live");
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>(
    {}
  );
  const [reminderIds, setReminderIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("promotions")
        .select(
          "id, title, description, status, starts_at, ends_at, banner_image_url"
        )
        .order("starts_at", { ascending: true });
      if (error) throw error;
      setPromotions((data || []) as Promotion[]);

      const ids = (data || []).map((p) => p.id);
      if (ids.length > 0) {
        const { data: productRows } = await supabase
          .from("promo_products")
          .select("promotion_id")
          .in("promotion_id", ids);
        const counts: Record<string, number> = {};
        (productRows || []).forEach((row) => {
          counts[row.promotion_id] = (counts[row.promotion_id] || 0) + 1;
        });
        setProductCounts(counts);
      }

      if (user) {
        const { data: reminders } = await supabase
          .from("promo_reminders")
          .select("promotion_id")
          .eq("user_id", user.id);
        setReminderIds(new Set((reminders || []).map((r) => r.promotion_id)));
      }
    } catch (error) {
      console.error("Error fetching promotions:", error);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleToggleReminder = async (promotionId: string) => {
    if (!user) {
      navigate(ROUTES.auth);
      return;
    }
    const hasReminder = reminderIds.has(promotionId);
    try {
      if (hasReminder) {
        await supabase
          .from("promo_reminders")
          .delete()
          .eq("promotion_id", promotionId)
          .eq("user_id", user.id);
        setReminderIds((prev) => {
          const next = new Set(prev);
          next.delete(promotionId);
          return next;
        });
        toast.success("Reminder removed");
      } else {
        await supabase
          .from("promo_reminders")
          .insert({ promotion_id: promotionId, user_id: user.id });
        setReminderIds((prev) => new Set(prev).add(promotionId));
        toast.success("We'll notify you when it goes live");
      }
    } catch (error) {
      console.error("Error toggling reminder:", error);
      toast.error("Failed to update reminder");
    }
  };

  const visiblePromotions = promotions.filter((p) => {
    if (activeTab === "upcoming") return p.status === "scheduled";
    if (activeTab === "live") return p.status === "live";
    return p.status === "ended";
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <main className="mx-auto max-w-4xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-flora-ink/15 bg-white text-flora-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-flora-ink sm:text-3xl">
              Promos
            </h1>
            <p className="text-sm text-flora-muted">
              Crazy deals, real prizes. Don't blink!
            </p>
          </div>
        </div>

        <div className="mb-6 flex w-fit gap-1 rounded-full border border-flora-ink/15 bg-white p-1">
          {(
            [
              {
                key: "upcoming",
                label: "Upcoming",
                count: promotions.filter((p) => p.status === "scheduled").length,
              },
              {
                key: "live",
                label: "Live Now",
                count: promotions.filter((p) => p.status === "live").length,
              },
              { key: "past", label: "Past", count: 0 },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-flora-ink text-white"
                  : "text-flora-ink hover:bg-flora-chip"
              }`}
            >
              {tab.label}
              {tab.key !== "past" && tab.count > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-flora-chip text-flora-ink"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-3xl bg-flora-card shadow-card"
              />
            ))}
          </div>
        ) : visiblePromotions.length === 0 ? (
          <div className="py-16 text-center">
            <Zap className="mx-auto mb-4 h-12 w-12 text-flora-muted" />
            <h3 className="mb-2 text-lg font-semibold text-flora-ink">
              {activeTab === "upcoming" && "Nothing scheduled yet"}
              {activeTab === "live" && "No live promos right now"}
              {activeTab === "past" && "No past promos yet"}
            </h3>
            <p className="text-flora-muted">
              {activeTab === "live"
                ? "Check the Upcoming tab and set a reminder for the next one."
                : "Check back soon!"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visiblePromotions.map((promotion) => (
              <PromoCard
                key={promotion.id}
                promotion={promotion}
                productCount={productCounts[promotion.id] || 0}
                hasReminder={reminderIds.has(promotion.id)}
                onToggleReminder={handleToggleReminder}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Promos;
