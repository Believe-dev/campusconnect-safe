import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Search, X, ArrowRight, TrendingUp, Tag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSearchSuggestions,
  type SearchSuggestion,
} from "@/hooks/useSearchSuggestions";

interface MobileExpandableSearchProps {
  onExpand?: (expanded: boolean) => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);

const MobileExpandableSearch = ({ onExpand }: MobileExpandableSearchProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  // Same fetch logic (including sellers) and the same 300ms debounce the
  // desktop SmartSearchInput uses — previously this component had its own
  // independently-drifted copy with no seller matching and an effectively
  // zero debounce.
  const { suggestions, loading } = useSearchSuggestions(searchQuery, isExpanded);

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

  const handleSearch = (query?: string) => {
    const searchTerm = query ?? searchQuery;
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      handleCollapse();
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.type === "seller" && suggestion.sellerId) {
      navigate(`/seller/${suggestion.sellerId}`);
      handleCollapse();
      return;
    }
    handleSearch(suggestion.text);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      handleCollapse();
    }
  };

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
            className="fixed inset-0 bg-flora-ink/40 backdrop-blur-md z-[9999] lg:hidden transition-all duration-300 opacity-100"
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
                  placeholder="Search products, sellers..."
                  className="w-full bg-transparent text-sm text-flora-ink placeholder:text-flora-muted focus:outline-none"
                />
              </div>
            </div>

            {/* Suggestions */}
            {searchQuery.length > 0 && (
              <div className="max-h-72 overflow-y-auto border-t border-flora-ink/10 bg-white">
                {loading && (
                  <div className="flex items-center justify-center py-4">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-flora-chip border-t-flora-leaf" />
                    <span className="ml-2 text-sm text-flora-muted">Searching...</span>
                  </div>
                )}

                {!loading &&
                  suggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSuggestionSelect(suggestion)}
                      className="flex w-full items-center justify-between gap-3 border-b border-flora-ink/5 px-4 py-3 text-left last:border-b-0 hover:bg-flora-chip/40"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {suggestion.imageUrl ? (
                          <img
                            src={suggestion.imageUrl}
                            alt=""
                            className={cn(
                              "h-9 w-9 shrink-0 object-cover",
                              suggestion.type === "seller" ? "rounded-full" : "rounded-xl"
                            )}
                          />
                        ) : (
                          <span
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center bg-flora-chip text-flora-muted",
                              suggestion.type === "seller" ? "rounded-full" : "rounded-xl"
                            )}
                          >
                            {suggestion.type === "seller" && <User className="h-4 w-4" />}
                            {suggestion.type === "category" && <Tag className="h-4 w-4" />}
                            {suggestion.type === "trending" && <TrendingUp className="h-4 w-4" />}
                            {suggestion.type === "product" && <Search className="h-4 w-4" />}
                          </span>
                        )}
                        <span className="min-w-0 flex-1 truncate">
                          <span className="block truncate text-sm font-medium text-flora-ink">
                            {suggestion.text}
                          </span>
                          {suggestion.subtitle && (
                            <span className="block truncate text-xs text-flora-muted">
                              {suggestion.subtitle}
                            </span>
                          )}
                        </span>
                        {suggestion.price != null && (
                          <span className="shrink-0 text-sm font-semibold text-flora-ink">
                            {formatPrice(suggestion.price)}
                          </span>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-flora-muted" />
                    </button>
                  ))}

                {/* Search query option */}
                <button
                  onClick={() => handleSearch()}
                  className="flex w-full items-center justify-between gap-3 border-t border-flora-ink/10 px-4 py-3 text-left hover:bg-flora-chip/40"
                >
                  <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-flora-leaf" />
                    <span className="text-sm text-flora-ink">
                      Search for &ldquo;
                      <span className="font-medium">{searchQuery}</span>&rdquo;
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-flora-leaf" />
                </button>
              </div>
            )}

            {/* Popular searches when no query */}
            {searchQuery.length === 0 && (
              <div className="border-t border-flora-ink/10 bg-flora-bgFrom/60 p-4">
                <p className="mb-3 text-xs font-medium text-flora-muted">Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {["Electronics", "Textbooks", "Fashion", "Furniture", "Sports Equipment"].map(
                    (item) => (
                      <button
                        key={item}
                        onClick={() => handleSearch(item)}
                        className="rounded-full border border-flora-ink/10 bg-white px-3 py-1.5 text-xs text-flora-ink transition hover:border-flora-leaf hover:text-flora-leaf"
                      >
                        {item}
                      </button>
                    )
                  )}
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
