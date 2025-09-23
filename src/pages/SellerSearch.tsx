import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Star, MapPin, ShieldCheck, User, Phone } from 'lucide-react';
import Header from '@/components/layout/Header';

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
  phone_number?: string;
  product_count?: number;
}

const SellerSearch = () => {
  const { user } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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
        .from('profiles')
        .select('university_name')
        .eq('user_id', user.id)
        .single();
      setUserUniversity(data?.university_name || null);
    } catch (error) {
      console.error('Error fetching user university:', error);
    }
  };

  const fetchSellers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id, full_name, university_name, campus, bio, avatar_url, rating, total_reviews, is_verified, account_type, phone_number,
          products!products_seller_id_fkey(id)
        `)
        .in('account_type', ['seller', 'both'])
        .not('is_banned', 'eq', true)
        .order('rating', { ascending: false });

      if (error) throw error;
      
      // Add product count and sort sellers
      const sellersWithCount = (data || []).map(seller => ({
        ...seller,
        product_count: seller.products?.filter((p: any) => p.id).length || 0
      }));
      
      const sortedSellers = sellersWithCount.sort((a, b) => {
        const aVerified = a.is_verified;
        const bVerified = b.is_verified;
        const aFromUserUni = userUniversity && a.university_name === userUniversity;
        const bFromUserUni = userUniversity && b.university_name === userUniversity;
        
        // Priority 1: Verified + Same University
        if (aVerified && aFromUserUni && !(bVerified && bFromUserUni)) return -1;
        if (bVerified && bFromUserUni && !(aVerified && aFromUserUni)) return 1;
        
        // Priority 2: Same University (non-verified)
        if (aFromUserUni && !aVerified && !bFromUserUni) return -1;
        if (bFromUserUni && !bVerified && !aFromUserUni) return 1;
        
        // Priority 3: Verified (different university)
        if (aVerified && !aFromUserUni && !bVerified && !bFromUserUni) return -1;
        if (bVerified && !bFromUserUni && !aVerified && !aFromUserUni) return 1;
        
        // Within same priority group, sort by rating
        return b.rating - a.rating;
      });
      
      setSellers(sortedSellers);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSellers = () => {
    if (!searchQuery) {
      setFilteredSellers(sellers);
      return;
    }

    const filtered = sellers.filter(seller =>
      seller.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.university_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seller.campus?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredSellers(filtered);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">Find Sellers</h1>
          <p className="text-muted-foreground mb-3">Discover trusted sellers in your university</p>
          {userUniversity && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Smart Sorting:</span> Showing verified sellers from {userUniversity} first, 
                followed by other sellers from your university, then verified sellers from other universities.
              </p>
            </div>
          )}
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sellers by name or university..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{filteredSellers.length}</span> sellers
          </p>
        </div>

        {filteredSellers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sellers found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSellers.map((seller) => (
              <Card 
                key={seller.user_id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/seller/${seller.user_id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={seller.avatar_url} alt={seller.full_name} />
                      <AvatarFallback className="bg-university-green text-white">
                        {getInitials(seller.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg truncate">{seller.full_name}</h3>
                        {seller.is_verified && (
                          <div className="verification-badge-inline">
                            <svg fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 mb-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground truncate">
                          {seller.university_name || seller.campus}
                        </span>
                      </div>
                      
                      {seller.phone_number && (
                        <div className="flex items-center gap-1 mb-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {seller.phone_number}
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{seller.rating.toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">
                          ({seller.total_reviews} reviews)
                        </span>
                      </div>
                      
                      <div className="mb-3">
                        <Badge variant="outline" className="text-xs">
                          {seller.product_count || 0} products
                        </Badge>
                      </div>
                      
                      {seller.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {seller.bio}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SellerSearch;