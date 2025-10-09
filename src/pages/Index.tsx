import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/enhanced-button';
import { OfflineNotice } from '@/components/ui/offline-notice';
import { SellerDocumentReminder } from '@/components/seller/SellerDocumentReminder';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { ProductFilters } from '@/components/home/ProductFilters';
import { ProductGrid } from '@/components/home/ProductGrid';
import { useAuth } from '@/hooks/useAuth';
import { useFeaturedProducts } from '@/hooks/useProducts';
import { ROUTES, CATEGORIES } from '@/lib/constants';
import { Filter } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';



const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, loading } = useFeaturedProducts();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  usePullToRefresh(); // Enable pull-to-refresh



  const handleViewProduct = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  // Enhanced filtering logic with keyword matching
  const filteredProducts = products.filter(product => {
    if (selectedCategory === 'all') return true;
    
    // Find the selected category
    const category = CATEGORIES.find(cat => cat.id === selectedCategory);
    if (!category) return false;
    
    // Check if product category matches exactly
    if (product.category === category.name || product.category === category.id) {
      return true;
    }
    
    // Check if product title or description contains category keywords
    const searchText = `${product.title} ${product.description}`.toLowerCase();
    return category.keywords.some(keyword => 
      searchText.includes(keyword.toLowerCase())
    );
  });


  return (
    <div className="min-h-screen beautiful-bg">
      <div className="container mx-auto px-4">
        <OfflineNotice />
        <SellerDocumentReminder />
      </div>
      
      <HeroSection isAuthenticated={!!user} />
      <FeaturesSection />

      {/* Marketplace Section */}
      <section id="marketplace" className="py-12 sm:py-16 pb-24 md:pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <h2 className="text-2xl sm:text-3xl font-bold">Latest Products</h2>
            <Button variant="outline" size="sm" className="sm:size-default" asChild>
              <Link to="/marketplace">
                View All <Filter className="h-4 w-4 ml-2" />
              </Link>
            </Button>
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
              <Link to={ROUTES.auth}>
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
