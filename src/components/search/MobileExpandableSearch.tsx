import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, X, ArrowRight, TrendingUp, Tag } from "lucide-react";
import { expandSearchTerms } from "@/utils/searchUtils";

interface SearchSuggestion {
  id: string;
  text: string;
  type: "product" | "category" | "trending" | "live_feed";
}

interface MobileExpandableSearchProps {
  onExpand?: (expanded: boolean) => void;
}

const MobileExpandableSearch = ({ onExpand }: MobileExpandableSearchProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleExpand = () => {
    setIsExpanded(true);
    onExpand?.(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setSearchQuery("");
    onExpand?.(false);
  };

  const fetchSuggestions = async (query: string) => {
    setLoading(true);
    try {
      const searchTerms = query.toLowerCase().trim();
      const expandedTerms = expandSearchTerms(searchTerms);

      // Smart search conditions with weighted relevance
      const titleConditions = expandedTerms.map(term => `title.ilike.%${term}%`).join(',');
      const descConditions = expandedTerms.map(term => `description.ilike.%${term}%`).join(',');
      const categoryConditions = expandedTerms.map(term => `category.ilike.%${term}%`).join(',');
      const searchConditions = [titleConditions, descConditions, categoryConditions].join(',');

      const { data: products } = await supabase
        .from("products")
        .select("title, category")
        .eq("is_active", true)
        .or(searchConditions)
        .order("created_at", { ascending: false })
        .limit(4);

      // Enhanced live feed search with description matching
      const liveFeedConditions = expandedTerms
        .map((term) => `title.ilike.%${term}%,description.ilike.%${term}%`)
        .join(",");
      const { data: liveFeeds } = await supabase
        .from("live_feed")
        .select("title")
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .or(liveFeedConditions)
        .order("created_at", { ascending: false })
        .limit(3);

      console.log("Live feed search results:", liveFeeds);
      
      // If no live feed matches, get recent ones as fallback
      let fallbackLiveFeeds = null;
      if (!liveFeeds || liveFeeds.length === 0) {
        const { data: recentLiveFeeds } = await supabase
          .from("live_feed")
          .select("title")
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(2);
        fallbackLiveFeeds = recentLiveFeeds;
        console.log('Fallback live feed results:', fallbackLiveFeeds);
      }

      const { data: categoryData } = await supabase
        .from("products")
        .select("category")
        .eq("is_active", true)
        .or(expandedTerms.map((term) => `category.ilike.%${term}%`).join(","))
        .limit(2);

      const newSuggestions: SearchSuggestion[] = [];
      const addedTexts = new Set<string>();

      // Add live feed results (prioritize search matches, then fallback)
      const liveFeedResults = liveFeeds && liveFeeds.length > 0 ? liveFeeds : fallbackLiveFeeds;
      if (liveFeedResults) {
        liveFeedResults.forEach((liveFeed) => {
          const titleLower = liveFeed.title.toLowerCase();
          if (!addedTexts.has(titleLower) && newSuggestions.length < 6) {
            newSuggestions.push({
              id: `live_feed-${liveFeed.title}`,
              text: liveFeed.title,
              type: "live_feed",
            });
            addedTexts.add(titleLower);
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
            });
            addedTexts.add(titleLower);
          }
        });
      }

      if (categoryData) {
        const uniqueCategories = [
          ...new Set(categoryData.map((c) => c.category)),
        ].filter((cat) => cat && !addedTexts.has(cat.toLowerCase()));

        uniqueCategories.slice(0, 2).forEach((category) => {
          newSuggestions.push({
            id: `category-${category}`,
            text: category,
            type: "category",
          });
          addedTexts.add(category.toLowerCase());
        });
      }

      // Sort suggestions by relevance
      const sortedSuggestions = newSuggestions.sort((a, b) => {
        // Prioritize live feed items
        if (a.type === 'live_feed' && b.type !== 'live_feed') return -1;
        if (b.type === 'live_feed' && a.type !== 'live_feed') return 1;
        
        // Then by text relevance to query
        const aRelevance = a.text.toLowerCase().includes(searchTerms) ? 1 : 0;
        const bRelevance = b.text.toLowerCase().includes(searchTerms) ? 1 : 0;
        return bRelevance - aRelevance;
      });
      
      setSuggestions(sortedSuggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query?: string) => {
    const searchTerm = query || searchQuery;
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      handleCollapse();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      handleCollapse();
    }
  };

  useEffect(() => {
    if (searchQuery.length >= 1) {
      const timeoutId = setTimeout(() => {
        fetchSuggestions(searchQuery);
      }, 0);
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isExpanded]);

  return (
    <>
      {/* Backdrop blur - rendered at body level */}
      {isExpanded &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-md z-[9999] lg:hidden transition-all duration-300 opacity-100"
            onClick={handleCollapse}
          />,
          document.body
        )}

      {/* Search trigger button — matches the other circular icon buttons in
          the header (rounded-full, translucent flora ghost tone). */}
      <button
        type="button"
        aria-label="Search"
        className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-flora-ink backdrop-blur-sm transition-all duration-300 hover:bg-white/90 ${
          isExpanded ? "opacity-0 scale-75 pointer-events-none" : "opacity-100 scale-100"
        }`}
        onClick={handleExpand}
      >
        <Search className="h-4 w-4" />
      </button>

      {/* Expanded search bar — a single leading icon inside the pill
          (matching SmartSearchInput's desktop treatment) instead of the
          previous absolutely-positioned trailing icon button, which read
          as misaligned against the input's own text baseline. */}
      {isExpanded &&
        createPortal(
          <div className="fixed top-0 left-0 right-0 z-[10000] bg-flora-bgFrom/95 backdrop-blur-sm shadow-lg lg:hidden animate-in slide-in-from-top duration-300">
            <div
              className="flex items-center gap-2 p-3"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
            >
              <button
                type="button"
                aria-label="Close search"
                onClick={handleCollapse}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-flora-ink backdrop-blur-sm"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-1 items-center gap-2 rounded-full border border-flora-ink/10 bg-white px-4 py-2.5 shadow-card">
                <Search className="h-4 w-4 shrink-0 text-flora-muted" aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Search products, categories..."
                  className="w-full bg-transparent text-sm text-flora-ink placeholder:text-flora-muted focus:outline-none"
                />
              </div>
            </div>

            {/* Smart suggestions */}
            {searchQuery.length > 0 && (
              <div className="border-t border-gray-100 bg-white max-h-60 overflow-y-auto">
                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-flora-leaf"></div>
                    <span className="ml-2 text-sm">Searching...</span>
                  </div>
                )}

                {!loading &&
                  suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSearch(suggestion.text)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        {suggestion.type === "live_feed" && (
                          <Search className="h-4 w-4 text-green-500" />
                        )}
                        {suggestion.type === "product" && (
                          <Search className="h-4 w-4 text-blue-500" />
                        )}
                        {suggestion.type === "category" && (
                          <Tag className="h-4 w-4 text-gray-400" />
                        )}
                        {suggestion.type === "trending" && (
                          <TrendingUp className="h-4 w-4 text-orange-500" />
                        )}
                        <span className="text-sm">{suggestion.text}</span>
                        {suggestion.type === "live_feed" && (
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                            LIVE
                          </span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}

                {/* Search query option */}
                <button
                  onClick={() => handleSearch()}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left border-t border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-flora-leaf" />
                    <span className="text-sm">
                      Search for "
                      <span className="font-medium">{searchQuery}</span>"
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-flora-leaf" />
                </button>
              </div>
            )}

            {/* Popular searches when no query */}
            {searchQuery.length === 0 && (
              <div className="border-t border-gray-100 bg-gray-50 p-4">
                <p className="text-xs text-gray-500 mb-3 font-medium">
                  Popular searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Electronics",
                    "Textbooks",
                    "Fashion",
                    "Furniture",
                    "Sports Equipment",
                  ].map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(item)}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs hover:border-flora-leaf hover:text-flora-leaf transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
};

export default MobileExpandableSearch;
