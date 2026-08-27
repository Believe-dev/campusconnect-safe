import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/contexts/ProfileContext";
import { pickDealsOfTheDay } from "@/lib/dealsOfTheDay";
import type { DealOfTheDayProduct } from "@/components/marketplace/DealOfTheDay";

interface DealRow {
  id: string;
  title: string;
  price: number;
  images: string[];
  profiles: {
    full_name: string;
    business_name?: string;
  } | null;
}

// Same filter/order/limit as Marketplace's own product fetch (is_active,
// created_at desc, capped at 200) — the day-index selection in
// pickDealsOfTheDay only lands on the same product on both pages if both
// pages are picking from the identical ordered pool.
export function useDealsOfTheDay(count = 5) {
  const { profile } = useProfile();
  const userUniversity = profile?.university_name || null;
  const [deals, setDeals] = useState<DealOfTheDayProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchDeals = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("products")
          .select(
            `
            id,
            title,
            price,
            images,
            campus,
            profiles!products_seller_id_fkey (
              full_name,
              business_name
            )
          `
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(200);

        if (userUniversity) {
          query = query.eq("campus", userUniversity);
        }

        const { data, error } = await query;
        if (error) throw error;

        const rows = (data || []) as unknown as DealRow[];
        const picked = pickDealsOfTheDay(rows, count);
        if (!cancelled) {
          setDeals(
            picked.map((row) => ({
              id: row.id,
              title: row.title,
              price: row.price,
              images: row.images,
              sellerName:
                row.profiles?.business_name || row.profiles?.full_name || "Unknown seller",
            }))
          );
        }
      } catch (error) {
        console.error("Error fetching deals of the day:", error);
        if (!cancelled) setDeals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDeals();
    return () => {
      cancelled = true;
    };
  }, [userUniversity, count]);

  return { deals, loading };
}
