import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Search } from "lucide-react";
import { expandSearchTerms } from "@/utils/searchUtils";

interface SearchSuggestion {
  id: string;
  text: string;
  type: "product" | "category" | "recent" | "trending" | "live_feed";
  count?: number;
  price?: number;
  imageUrl?: string;
}

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
  autoFocus?: boolean;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);

// One place to define each suggestion type's section heading. Rows
// themselves no longer carry a per-type icon/color tile — they show the
// actual product/live-feed photo, or a plain search icon when no photo
// is available — so this is just the grouping label now.
const TYPE_META: Record<SearchSuggestion["type"], { heading: string }> = {
  live_feed: { heading: "Live Now" },
  product: { heading: "Products" },
  category: { heading: "Categories" },
  trending: { heading: "Trending" },
  recent: { heading: "Recent" },
};

const GROUP_ORDER: SearchSuggestion["type"][] = [
  "live_feed",
  "product",
  "category",
  "trending",
  "recent",
];

const SmartSearchInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Search products, categories...",
  showSuggestions = true,
  autoFocus = false,
}: SmartSearchInputProps) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.length >= 1 && showSuggestions) {
      const timeoutId = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
    }
  }, [value, showSuggestions]);

  const fetchSuggestions = async (query: string) => {
    setLoading(true);
    try {
      const searchTerms = query.toLowerCase().trim();
      const expandedTerms = expandSearchTerms(searchTerms);

      // Build smart search conditions
      const searchConditions = expandedTerms
        .map(
          (term) =>
            `title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`,
        )
        .join(",");

      // Get product suggestions with smart matching
      const { data: products } = await supabase
        .from("products")
        .select("title, category, price, images")
        .eq("is_active", true)
        .or(searchConditions)
        .order("created_at", { ascending: false })
        .limit(6);

      // Get live feed suggestions
      const { data: liveFeeds } = await supabase
        .from("live_feed")
        .select("title, price, image_url")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .or(searchConditions)
        .order("created_at", { ascending: false })
        .limit(4);

      // Get popular categories from both products and live feed
      const [{ data: categoryData }, { data: liveFeedTitles }] =
        await Promise.all([
          supabase
            .from("products")
            .select("category")
            .eq("is_active", true)
            .or(
              expandedTerms.map((term) => `category.ilike.%${term}%`).join(","),
            )
            .limit(3),
          supabase
            .from("live_feed")
            .select("title")
            .eq("is_active", true)
            .gt("expires_at", new Date().toISOString())
            .or(expandedTerms.map((term) => `title.ilike.%${term}%`).join(","))
            .limit(2),
        ]);

      const newSuggestions: SearchSuggestion[] = [];
      const addedTexts = new Set<string>();

      // Add live feed matches first (higher priority)
      if (liveFeeds) {
        liveFeeds.forEach((liveFeed) => {
          const titleLower = liveFeed.title.toLowerCase();
          if (!addedTexts.has(titleLower) && newSuggestions.length < 6) {
            newSuggestions.push({
              id: `live_feed-${liveFeed.title}`,
              text: liveFeed.title,
              type: "live_feed",
              price: liveFeed.price,
              imageUrl: liveFeed.image_url,
            });
            addedTexts.add(titleLower);
          }
        });
      }

      // Add additional live feed titles from search
      if (liveFeedTitles) {
        liveFeedTitles.forEach((item) => {
          const titleLower = item.title.toLowerCase();
          if (!addedTexts.has(titleLower) && newSuggestions.length < 6) {
            newSuggestions.push({
              id: `live_feed_search-${item.title}`,
              text: item.title,
              type: "live_feed",
            });
            addedTexts.add(titleLower);
          }
        });
      }

      // Add exact product matches
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

      // Add category suggestions
      if (categoryData) {
        const uniqueCategories = [
          ...new Set(categoryData.map((c) => c.category)),
        ].filter((cat) => cat && !addedTexts.has(cat.toLowerCase()));

        uniqueCategories.slice(0, 3).forEach((category) => {
          newSuggestions.push({
            id: `category-${category}`,
            text: category,
            type: "category",
          });
          addedTexts.add(category.toLowerCase());
        });
      }

      // Add smart trending suggestions
      if (newSuggestions.length < 6) {
        const smartSuggestions = [
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
        ].filter((item) => {
          const itemLower = item.toLowerCase();
          return (
            !addedTexts.has(itemLower) &&
            (itemLower.includes(searchTerms) ||
              searchTerms.includes(itemLower.slice(0, 3)))
          );
        });

        smartSuggestions
          .slice(0, 6 - newSuggestions.length)
          .forEach((suggestion) => {
            newSuggestions.push({
              id: `trending-${suggestion}`,
              text: suggestion,
              type: "trending",
            });
          });
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    setIsOpen(false);
    if (onSubmit) {
      onSubmit(suggestion.text);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    inputRef.current?.blur(); // Dismiss keyboard on mobile
    if (onSubmit) {
      onSubmit(value);
    } else if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  // Grouped into labeled sections (Live Now / Products / Categories /
  // Trending) instead of one flat list with an inline type badge on every
  // row — the badge-per-row approach was saying the same thing three times
  // (icon, badge text, and implicitly the row's position) for no real
  // gain. A once-per-section heading reads cleaner.
  const groups = GROUP_ORDER.map((type) => ({
    type,
    items: suggestions.filter((s) => s.type === type),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="relative w-full">
      <form
        onSubmit={handleSubmit}
        className="flex w-full items-center gap-2 rounded-full border border-flora-ink/10 bg-white px-4 py-0 shadow-card"
      >
        <Search
          className="h-4 w-4 shrink-0 text-flora-muted"
          aria-hidden="true"
        />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(e.target.value.length >= 1 && showSuggestions);
          }}
          onFocus={() =>
            setIsOpen(
              value.length >= 1 && suggestions.length > 0 && showSuggestions,
            )
          }
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          // min-h-0: opts out of the site-wide 44px touch-target minimum
          // (accessibility.css targets <input> directly) — min-height is a
          // separate constraint from height/padding, so no amount of
          // shrinking those could ever get this below 44px without this.
          className="h-auto min-h-0 border-0 bg-transparent p-3 text-sm text-flora-ink shadow-none placeholder:text-flora-muted focus-visible:ring-0 focus-visible:ring-offset-0"
          autoFocus={autoFocus}
        />
      </form>

      <AnimatePresence>
        {isOpen && (suggestions.length > 0 || loading) && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-3xl border border-flora-ink/5 bg-white shadow-floating"
          >
            <Command className="rounded-3xl bg-transparent text-flora-ink [&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-flora-muted">
              <CommandEmpty>
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-flora-muted">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-flora-chip border-t-flora-leaf" />
                    <span className="text-sm">Searching...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-flora-chip text-flora-muted">
                      <Search className="h-4 w-4" />
                    </span>
                    <p className="text-sm text-flora-muted">
                      No results for &ldquo;{value}&rdquo;
                    </p>
                  </div>
                )}
              </CommandEmpty>

              {groups.map(({ type, items }) => {
                const { heading } = TYPE_META[type];
                return (
                  <CommandGroup key={type} heading={heading} className="px-2 pb-1">
                    {items.map((suggestion) => {
                      return (
                        <CommandItem
                          key={suggestion.id}
                          onSelect={() => handleSuggestionSelect(suggestion)}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 data-[selected='true']:bg-flora-chip data-[selected=true]:text-flora-ink"
                        >
                          {suggestion.imageUrl ? (
                            <img
                              src={suggestion.imageUrl}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-flora-chip text-flora-muted">
                              <Search className="h-4 w-4" />
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-flora-ink">
                            {suggestion.text}
                          </span>
                          {suggestion.type === "live_feed" && (
                            <span className="flex shrink-0 items-center gap-1 rounded-full bg-flora-leaf/15 px-2 py-1 text-[10px] font-bold text-flora-leaf">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flora-leaf" />
                              LIVE
                            </span>
                          )}
                          {suggestion.price != null && (
                            <span className="shrink-0 text-sm font-semibold text-flora-ink">
                              {formatPrice(suggestion.price)}
                            </span>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                );
              })}
            </Command>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SmartSearchInput;
