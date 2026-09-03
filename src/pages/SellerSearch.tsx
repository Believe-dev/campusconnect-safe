import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Search, Star, MapPin, ShieldCheck, User } from "lucide-react";

interface Seller {
  user_id: string;
  full_name: string;
  university_name: string;
  campus: string;
  bio: string;
  avatar_url: string;
  rating: number;
  total_reviews: number;
  is_verified: boolean;
  product_count?: number;
}

const SellerSearch = () => {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [userUniversity, setUserUniversity] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchUserUniversity();
    }
    fetchSellers();
  }, [user]);

  useEffect(() => {
    filterSellers();
  }, [sellers, searchQuery, userUniversity]);

  useEffect(() => {
    if (userUniversity && sellers.length > 0) {
      fetchSellers(); // Re-fetch to apply university sorting
    }
  }, [userUniversity]);

  const fetchUserUniversity = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase
        .from("profiles")
        .select("university_name")
        .eq("user_id", user.id)
        .single();
      setUserUniversity(data?.university_name || null);
    } catch (error) {
      // Error handled silently
    }
  };

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          user_id, full_name, university_name, campus, bio, avatar_url, rating, total_reviews, is_verified, account_type,
          products!products_seller_id_fkey(id)
        `,
        )
        .in("account_type", ["seller", "both"])
        .not("is_banned", "eq", true)
        .order("rating", { ascending: false });

      if (error) throw error;

      // Add product count and sort sellers
      const sellersWithCount = (data || []).map((seller) => ({
        ...seller,
        product_count: seller.products?.filter((p: any) => p.id).length || 0,
      }));

      const sortedSellers = sellersWithCount.sort((a, b) => {
        const aVerified = a.is_verified;
        const bVerified = b.is_verified;
        const aHasProducts = a.product_count > 0;
        const bHasProducts = b.product_count > 0;

        // Priority 1: Verified sellers with products
        if (aVerified && aHasProducts && !(bVerified && bHasProducts))
          return -1;
        if (bVerified && bHasProducts && !(aVerified && aHasProducts)) return 1;

        // Priority 2: Sellers with products (non-verified)
        if (aHasProducts && !aVerified && !bHasProducts) return -1;
        if (bHasProducts && !bVerified && !aHasProducts) return 1;

        // Priority 3: Verified sellers without products
        if (aVerified && !aHasProducts && !bVerified && !bHasProducts)
          return -1;
        if (bVerified && !bHasProducts && !aVerified && !bHasProducts) return 1;

        // Within same priority group, sort by rating
        return b.rating - a.rating;
      });

      setSellers(sortedSellers);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const filterSellers = () => {
    if (!searchQuery) {
      setFilteredSellers(sellers);
      return;
    }

    const filtered = sellers.filter(
      (seller) =>
        seller.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        seller.university_name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        seller.campus?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setFilteredSellers(filtered);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 rounded-full bg-flora-chip" />
            <div className="h-12 rounded-2xl bg-flora-chip/60" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 rounded-3xl bg-flora-chip/60" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-flora-ink sm:text-3xl">
            Find Sellers
          </h1>
          <p className="mt-1 text-sm text-flora-muted sm:text-base">
            Discover trusted sellers in your university
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-5 rounded-2xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-flora-muted" />
          <input
            placeholder="Search sellers by name or university..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-4xl bg-flora-card py-3 pl-11 pr-4 text-sm text-flora-ink shadow-card placeholder:text-flora-muted focus:outline-none focus:ring-2 focus:ring-flora-leaf/40"
          />
        </div>

        <p className="mb-4 text-sm text-flora-muted">
          <span className="font-medium text-flora-ink">
            {filteredSellers.length}
          </span>{" "}
          sellers
        </p>

        {filteredSellers.length === 0 ? (
          <div className="rounded-3xl bg-flora-card p-10 text-center shadow-card sm:p-12">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-flora-chip">
              <User className="h-7 w-7 text-flora-muted" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-flora-ink">
              No sellers found
            </h3>
            <p className="text-sm text-flora-muted">
              Try adjusting your search terms
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSellers.map((seller) => (
              <button
                key={seller.user_id}
                type="button"
                onClick={() => navigate(`/seller/${seller.user_id}`)}
                className="rounded-3xl bg-flora-card p-4 text-left shadow-card transition hover:brightness-[0.98] sm:p-5">
                <div className="flex items-start gap-3">
                  {seller.avatar_url ? (
                    <img
                      src={seller.avatar_url}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-flora-chip"
                    />
                  ) : (
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-flora-chip text-base font-semibold text-flora-ink ring-2 ring-flora-chip">
                      {getInitials(seller.full_name)}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-base font-semibold text-flora-ink">
                        {seller.full_name}
                      </h3>
                      {seller.is_verified && (
                        <ShieldCheck className="h-4 w-4 shrink-0 text-flora-leaf" />
                      )}
                    </div>

                    <div className="mt-0.5 flex items-center gap-1 text-xs text-flora-muted">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {seller.university_name || seller.campus}
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-flora-ink">
                        {seller.rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-flora-muted">
                        ({seller.total_reviews})
                      </span>
                      <span className="ml-auto shrink-0 rounded-full bg-flora-chip px-2 py-0.5 text-[10px] font-medium text-flora-muted">
                        {seller.product_count || 0} products
                      </span>
                    </div>
                  </div>
                </div>

                {seller.bio && (
                  <p className="mt-3 line-clamp-2 text-xs text-flora-muted">
                    {seller.bio}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SellerSearch;
