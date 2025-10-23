import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/enhanced-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OfflineNotice } from "@/components/ui/offline-notice";
import { SellerDocumentReminder } from "@/components/seller/SellerDocumentReminder";
import { ProductFilters } from "@/components/home/ProductFilters";
import { ProductGrid } from "@/components/home/ProductGrid";
import { PullToRefresh } from "@/components/common/PullToRefresh";
import { useAuth } from "@/hooks/useAuth";
import { useFeaturedProducts } from "@/hooks/useProducts";
import { ROUTES, CATEGORIES } from "@/lib/constants";
import {
  ArrowRight,
  Shield,
  Users,
  Zap,
  TrendingUp,
  Star,
  CheckCircle,
  Store,
} from "lucide-react";
import "@/styles/animations.css";

// Animated Counter Component
const AnimatedCounter = ({
  end,
  duration = 2000,
  suffix = "",
}: {
  end: number;
  duration?: number;
  suffix?: string;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, loading } = useFeaturedProducts();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const handleRefresh = useCallback(async () => {
    // Simulate refresh without page reload
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Trigger re-fetch of products
    window.location.reload();
  }, []);

  const handleViewProduct = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  // Enhanced filtering logic with keyword matching
  const filteredProducts = products.filter((product) => {
    if (selectedCategory === "all") return true;

    // Find the selected category
    const category = CATEGORIES.find((cat) => cat.id === selectedCategory);
    if (!category) return false;

    // Check if product category matches exactly
    if (
      product.category === category.name ||
      product.category === category.id
    ) {
      return true;
    }

    // Check if product title or description contains category keywords
    const searchText = `${product.title} ${product.description}`.toLowerCase();
    return category.keywords.some((keyword) =>
      searchText.includes(keyword.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className="container mx-auto px-4">
          <OfflineNotice />
          <SellerDocumentReminder />
        </div>

      {/* Modern Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/UniMarket.jpg"
            alt="UniMarket Background"
            className="w-full h-full object-cover opacity-10"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-university-green/20 to-blue-600/20 opacity-30" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <Badge className="mb-6 bg-university-green/10 text-university-green border-university-green/20 animate-fade-in">
              🎓 Nigeria's #1 Student Marketplace
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight animate-slide-up">
              Buy & Sell with
              <span className="text-university-green block animate-pulse-slow">
                Fellow Students
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed animate-fade-in-delay">
              Join thousands of students across Nigeria trading textbooks,
              electronics, and more in a safe, verified environment.
            </p>

            {!user ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button
                  size="lg"
                  className="bg-university-green hover:bg-university-green/90 text-white px-8 py-4 text-lg"
                  asChild
                >
                  <Link to={ROUTES.auth}>
                    Start Shopping <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 text-lg"
                  asChild
                >
                  <Link to="/marketplace">Browse Products</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button
                  size="lg"
                  className="bg-university-green hover:bg-university-green/90 text-white px-8 py-4 text-lg"
                  asChild
                >
                  <Link to="/marketplace">
                    Shop Now <Store className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 text-lg"
                  asChild
                >
                  <Link to="/sell">Start Selling</Link>
                </Button>
              </div>
            )}

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center animate-fade-in-up">
              <div className="hover:scale-105 transition-transform duration-300">
                <div className="text-2xl font-bold text-university-green">
                  <AnimatedCounter end={50} suffix="K+" />
                </div>
                <div className="text-sm text-gray-600">Active Students</div>
              </div>
              <div className="hover:scale-105 transition-transform duration-300">
                <div className="text-2xl font-bold text-university-green">
                  <AnimatedCounter end={200} suffix="+" />
                </div>
                <div className="text-sm text-gray-600">Universities</div>
              </div>
              <div className="hover:scale-105 transition-transform duration-300">
                <div className="text-2xl font-bold text-university-green">
                  ₦<AnimatedCounter end={2} suffix="M+" />
                </div>
                <div className="text-sm text-gray-600">Transactions</div>
              </div>
              <div className="hover:scale-105 transition-transform duration-300">
                <div className="text-2xl font-bold text-university-green">
                  <AnimatedCounter end={4.8} suffix="★" />
                </div>
                <div className="text-sm text-gray-600">User Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Students Choose UniMarket
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Built specifically for Nigerian students, by students
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in-up">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-university-green/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
                  <Shield className="h-8 w-8 text-university-green" />
                </div>
                <h3 className="text-xl font-semibold mb-4">100% Secure</h3>
                <p className="text-gray-600">
                  Student ID verification, escrow payments, and monitored
                  transactions ensure your safety.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in-up animation-delay-200">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow animation-delay-100">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Campus Community</h3>
                <p className="text-gray-600">
                  Connect with verified students from your university and nearby
                  campuses.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in-up animation-delay-400">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow animation-delay-200">
                  <Zap className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Instant Deals</h3>
                <p className="text-gray-600">
                  Real-time messaging, quick payments, and same-day pickup
                  options.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Marketplace Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Latest Products
            </h2>
            <p className="text-xl text-gray-600">
              Fresh listings from students across Nigeria
            </p>
          </div>

          <ProductFilters
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
          />

          <ProductGrid
            products={products}
            loading={loading}
            isAuthenticated={!!user}
            onViewProduct={handleViewProduct}
            filteredProducts={filteredProducts}
          />

          <div className="text-center mt-12">
            <Button variant="outline" size="lg" className="px-8 py-4" asChild>
              <Link to="/marketplace">
                View All Products <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Students Nationwide
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "UniMarket made it so easy to sell my old textbooks and buy
                  new ones. The verification process gives me confidence."
                </p>
                <div className="text-sm text-gray-500">
                  - Adebayo, University of Lagos
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "Found my laptop at an amazing price from a fellow student.
                  The escrow system made the transaction super safe."
                </p>
                <div className="text-sm text-gray-500">
                  - Fatima, Ahmadu Bello University
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 mb-4">
                  "As a seller, I love how quickly I can list items and connect
                  with buyers on campus. Great platform!"
                </p>
                <div className="text-sm text-gray-500">
                  - Chidi, University of Nigeria
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      {!user && (
        <section className="py-20 bg-gradient-to-r from-university-green to-blue-600">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
              Join Nigeria's Largest Student Marketplace
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Start buying and selling with verified students today. It's free
              to join!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="px-8 py-4 text-lg"
                asChild
              >
                <Link to={ROUTES.auth}>
                  Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-6 mt-8 text-white/80">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>Free to join</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>Verified students only</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span>Secure payments</span>
              </div>
            </div>
          </div>
        </section>
      )}
      </PullToRefresh>
    </div>
  );
};

export default Index;
