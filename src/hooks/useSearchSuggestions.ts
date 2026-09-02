import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { expandSearchTerms } from "@/utils/searchUtils";

export interface SearchSuggestion {
  id: string;
  text: string;
  type: "product" | "category" | "recent" | "trending" | "seller";
  count?: number;
  price?: number;
  imageUrl?: string;
  sellerId?: string;
  subtitle?: string;
}

// `business_name` is a real column on `profiles` (used successfully
// elsewhere, e.g. SellerProfile.tsx, Marketplace.tsx) that's simply missing
// from the generated Supabase types file — `.returns<T>()` overrides the
// query's inferred type for this one call rather than fighting the stale
// generated types or cargo-culting an `any` cast.
interface SellerRow {
  user_id: string;
  full_name: string;
  business_name: string | null;
  avatar_url: string | null;
}

const TRENDING_FALLBACK = [
  "iPhone",
  "MacBook",
  "Samsung",
  "Textbooks",
  "Laptop",
  "Headphones",
  "Nike Shoes",
  "Backpack",
  "Calculator",
  "Notebook",
  "Charger",
  "Books",
];

// Single source of truth for search-suggestion fetching, shared by
// SmartSearchInput (desktop) and MobileExpandableSearch (mobile) — the two
// previously had their own independently-drifted copies of this logic,
// which is how mobile ended up missing seller matches and running with an
// effectively-zero debounce while desktop had a proper 300ms one.
export const fetchSearchSuggestions = async (query: string): Promise<SearchSuggestion[]> => {
  const searchTerms = query.toLowerCase().trim();
  const expandedTerms = expandSearchTerms(searchTerms);

  const searchConditions = expandedTerms
    .map((term) => `title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`)
    .join(",");

  const { data: products } = await supabase
    .from("products")
    .select("title, category, price, images")
    .eq("is_active", true)
    .or(searchConditions)
    .order("created_at", { ascending: false })
    .limit(6);

  const sellerConditions = expandedTerms
    .map((term) => `full_name.ilike.%${term}%,business_name.ilike.%${term}%`)
    .join(",");
  const { data: sellers } = await supabase
    .from("profiles")
    .select("user_id, full_name, business_name, avatar_url")
    .in("account_type", ["seller", "both"])
    .eq("seller_status", "approved")
    .or(sellerConditions)
    .limit(3)
    .returns<SellerRow[]>();

  const { data: categoryData } = await supabase
    .from("products")
    .select("category")
    .eq("is_active", true)
    .or(expandedTerms.map((term) => `category.ilike.%${term}%`).join(","))
    .limit(3);

  const newSuggestions: SearchSuggestion[] = [];
  const addedTexts = new Set<string>();

  // Sellers — keyed by user_id, not deduped against addedTexts (a seller's
  // name colliding with a product title is fine; different result kinds).
  if (sellers) {
    sellers.forEach((seller) => {
      if (newSuggestions.length < 6) {
        newSuggestions.push({
          id: `seller-${seller.user_id}`,
          text: seller.business_name || seller.full_name,
          type: "seller",
          imageUrl: seller.avatar_url,
          sellerId: seller.user_id,
          subtitle: seller.business_name ? seller.full_name : undefined,
        });
      }
    });
  }

  if (products) {
    products.forEach((product) => {
      const titleLower = product.title.toLowerCase();
      if (!addedTexts.has(titleLower) && newSuggestions.length < 6) {
        newSuggestions.push({
          id: `product-${product.title}`,
          text: product.title,
          type: "product",
          price: product.price,
          imageUrl: product.images?.[0],
        });
        addedTexts.add(titleLower);
      }
    });
  }

  if (categoryData) {
    const uniqueCategories = [...new Set(categoryData.map((c) => c.category))].filter(
      (cat) => cat && !addedTexts.has(cat.toLowerCase())
    );
    uniqueCategories.slice(0, 3).forEach((category) => {
      newSuggestions.push({ id: `category-${category}`, text: category, type: "category" });
      addedTexts.add(category.toLowerCase());
    });
  }

  if (newSuggestions.length < 6) {
    const smartSuggestions = TRENDING_FALLBACK.filter((item) => {
      const itemLower = item.toLowerCase();
      return (
        !addedTexts.has(itemLower) &&
        (itemLower.includes(searchTerms) || searchTerms.includes(itemLower.slice(0, 3)))
      );
    });
    smartSuggestions.slice(0, 6 - newSuggestions.length).forEach((suggestion) => {
      newSuggestions.push({ id: `trending-${suggestion}`, text: suggestion, type: "trending" });
    });
  }

  return newSuggestions;
};

export const useSearchSuggestions = (query: string, enabled = true) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || query.length < 1) {
      setSuggestions([]);
      return;
    }
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        setSuggestions(await fetchSearchSuggestions(query));
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query, enabled]);

  return { suggestions, loading };
};
