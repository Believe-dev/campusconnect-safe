import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ROUTES } from "@/lib/constants";

interface BannerPromo {
  id: string;
  title: string;
  banner_image_url: string;
}

// Same rotation shape as DealOfTheDay (index + interval, modulo count) -
// simpler here since it's one full-width slide at a time rather than a
// two-card side-by-side layout. Only ever shows live promotions that have a
// banner set - drafts/scheduled/ended/disabled promos, or live ones with no
// banner, never appear here regardless of how many promotions exist overall.
// No fixed aspect ratio here on purpose - banners are uploaded at whatever
// ratio the admin designed them at, and cropping to a fixed box would cut
// off text/logos. The image keeps its natural ratio (h-auto) and the
// container just caps how wide it's allowed to get on larger screens.
const ROTATE_MS = 5000;

export const PromoBannerCarousel = () => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState<BannerPromo[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("promotions")
        .select("id, title, banner_image_url")
        .eq("status", "live")
        .not("banner_image_url", "is", null)
        .order("starts_at", { ascending: true });
      setBanners((data || []) as BannerPromo[]);
    };
    load();
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const current = banners[index];

  return (
    <div className="mx-auto mt-6 sm:max-w-xl">
      <button
        type="button"
        onClick={() => navigate(`${ROUTES.promos}/${current.id}`)}
        className="block w-full overflow-hidden rounded-4xl shadow-floating"
      >
        <img
          key={current.id}
          src={current.banner_image_url}
          alt={current.title}
          className="animate-deal-flip-in h-auto w-full"
        />
      </button>
      {banners.length > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {banners.map((banner, i) => (
            <span
              key={banner.id}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-5 bg-flora-ink" : "w-1.5 bg-flora-chip"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PromoBannerCarousel;
