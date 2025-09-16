import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { SAFE_PROFILE_SELECT } from '@/lib/profileSecurity';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Header from '@/components/layout/Header';
import ProductCard from '@/components/marketplace/ProductCard';
import { OfflineNotice } from '@/components/ui/offline-notice';
import heroImage from '@/assets/hero-marketplace.jpg';
import { 
  Search, 
  ShoppingBag, 
  MessageCircle, 
  Shield, 
  TrendingUp,
  Book,
  Laptop,
  Shirt,
  Utensils,
  MapPin,
  Filter
} from 'lucide-react';
import { User, Session } from '@supabase/supabase-js';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  campus: string;
  condition: string;
  seller_id: string;
  seller: {
    full_name: string;
    rating: number;
    is_verified: boolean;
  } | null;
}

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    fetchProducts();
    return () => subscription.unsubscribe();
  }, []);

  const fetchProducts = async () => {
    try {
      // Optimize query for slow connections
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          price,
          images,
          category,
          campus,
          condition,
          seller_id,
          profiles!seller_id (
            full_name,
            rating,
            is_verified
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data?.map(product => ({
        ...product,
        seller: product.profiles
      })) || []);
    } catch (error) {
      console.error('Error in fetchProducts:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All Categories', icon: ShoppingBag },
    { id: 'Books & Textbooks', name: 'Books', icon: Book },
    { id: 'Electronics', name: 'Electronics', icon: Laptop },
    { id: 'Fashion & Accessories', name: 'Fashion', icon: Shirt },
    { id: 'Food & Beverages', name: 'Food & Snacks', icon: Utensils },
  ];

  const campuses = [
    { id: 'all', name: 'All Campuses' },
    { id: 'main_campus', name: 'Main Campus' },
    { id: 'akoka_campus', name: 'Akoka Campus' },
    { id: 'yaba_campus', name: 'Yaba Campus' },
    { id: 'distance_learning', name: 'Distance Learning' }
  ];

  const handleViewProduct = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const handleMessageSeller = async (productId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;

      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('product_id', productId)
        .eq('buyer_id', user.id)
        .eq('seller_id', product.seller_id)
        .maybeSingle();

      if (existingConversation) {
        navigate('/messages');
        return;
      }

      // Create new conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .insert({
          product_id: productId,
          buyer_id: user.id,
          seller_id: product.seller_id
        });

      if (conversationError) {
        console.error('Error creating conversation:', conversationError);
        return;
      }

      navigate('/messages');
    } catch (error) {
      console.error('Error handling message seller:', error);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4">
        <OfflineNotice />
      </div>
      
      {/* Hero Section */}
      <section className="relative gradient-hero py-12 sm:py-16 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{
            backgroundImage: `url(${heroImage})`
          }}
        />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6">
            Nigeria's Trusted
            <span className="block gradient-accent bg-clip-text text-transparent">
              University Marketplace
            </span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Buy and sell safely within your university community. 
            Secure payments, verified students, monitored transactions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            {user ? (
              <Button variant="secondary" size="lg" className="sm:size-xl" asChild>
                <Link to="/marketplace">
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Browse Products
                </Link>
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="lg" className="sm:size-xl" asChild>
                  <Link to="/auth">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Join Marketplace
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="sm:size-xl text-white border-white hover:bg-white hover:text-primary" asChild>
                  <Link to="/learn-more">Learn More</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <Card className="text-center">
              <CardHeader className="pb-4">
                <Shield className="h-10 w-10 sm:h-12 sm:w-12 text-university-green mx-auto mb-3 sm:mb-4" />
                <CardTitle className="text-lg sm:text-xl">Secure Transactions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm sm:text-base">
                  Escrow payments and monitored chat ensure safe trading within your university community.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader className="pb-4">
                <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 text-university-green mx-auto mb-3 sm:mb-4" />
                <CardTitle className="text-lg sm:text-xl">In-App Messaging</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm sm:text-base">
                  Chat safely with sellers through our monitored system. No external contact needed.
                </CardDescription>
              </CardContent>
            </Card>
            
            <Card className="text-center">
              <CardHeader className="pb-4">
                <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 text-university-green mx-auto mb-3 sm:mb-4" />
                <CardTitle className="text-lg sm:text-xl">Student Verified</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm sm:text-base">
                  Only verified university students can join. Build trust within your academic community.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Marketplace Section */}
      <section id="marketplace" className="py-12 sm:py-16 pb-20 md:pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold">Latest Products</h2>
            <Button variant="outline" size="sm" className="sm:size-default" asChild>
              <Link to="/marketplace">
                View All <Filter className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            {/* Categories */}
            <div className="overflow-x-auto">
              <div className="flex gap-2 pb-2 min-w-max">
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? "marketplace" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="gap-2 flex-shrink-0"
                  >
                    <category.icon className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">{category.name}</span>
                  </Button>
                ))}
              </div>
            </div>
            
            {/* Campus Filter */}
            <div className="overflow-x-auto">
              <div className="flex gap-2 pb-2 min-w-max">
                {campuses.map((campus) => (
                  <Button
                    key={campus.id}
                    variant={selectedCampus === campus.id ? "marketplace" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCampus(campus.id)}
                    className="gap-2 flex-shrink-0"
                  >
                    <MapPin className="h-3 w-3" />
                    <span className="text-xs sm:text-sm">{campus.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-square bg-muted" />
                  <CardContent className="p-3 sm:p-4 space-y-2">
                    <div className="h-3 sm:h-4 bg-muted rounded" />
                    <div className="h-2 sm:h-3 bg-muted rounded w-2/3" />
                    <div className="h-4 sm:h-6 bg-muted rounded w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {products
                .filter(product => {
                  const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
                  let matchesCampus = true;
                  
                  if (selectedCampus !== 'all') {
                    const selectedCampusName = campuses.find(c => c.id === selectedCampus)?.name;
                    matchesCampus = product.campus === selectedCampusName;
                  }
                  
                  return matchesCategory && matchesCampus;
                })
                 .map((product) => (
                   <ProductCard
                     key={product.id}
                     product={product}
                     onViewProduct={handleViewProduct}
                     isAuthenticated={!!user}
                   />
                ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 px-4">
              <ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="text-lg sm:text-xl font-semibold mb-2">No products found</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4">
                Be the first to list a product in your university!
              </p>
              {user && (
                <Button variant="brand" size="sm" className="sm:size-default" asChild>
                  <Link to="/sell">Start Selling</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-12 sm:py-16 gradient-hero mb-16 md:mb-0">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
              Ready to Join Nigeria's University Marketplace?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Connect with students, buy and sell safely within your campus community.
            </p>
            <Button variant="secondary" size="lg" className="sm:size-xl" asChild>
              <Link to="/auth">
                Get Started Today
              </Link>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
};

export default Index;
