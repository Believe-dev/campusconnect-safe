import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';
import { Product } from '@/lib/types';
import { ROUTES } from '@/lib/constants';
import ProductCard from '@/components/marketplace/ProductCard';
import { CardSkeleton, EmptyState } from '@/components/common/LoadingState';

interface ProductGridProps {
  products: Product[];
  loading: boolean;
  isAuthenticated: boolean;
  onViewProduct: (id: string) => void;
  filteredProducts: Product[];
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  loading,
  isAuthenticated,
  onViewProduct,
  filteredProducts,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        title="No products found"
        description="Be the first to list a product in your university!"
        icon={<ShoppingBag className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mx-auto" />}
        action={
          isAuthenticated && (
            <Button variant="brand" size="sm" className="sm:size-default" asChild>
              <Link to={ROUTES.sell}>Start Selling</Link>
            </Button>
          )
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {filteredProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onViewProduct={onViewProduct}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
};