import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Star, MapPin } from 'lucide-react';
import { Product } from '@/lib/types';
import { ROUTES } from '@/lib/constants';
import { CardSkeleton, EmptyState } from '@/components/common/LoadingState';
import { useImagePriority } from '@/hooks/useImagePriority';

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
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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
            <Button variant="default" size="sm" className="sm:size-default" asChild>
              <Link to={ROUTES.sell}>Start Selling</Link>
            </Button>
          )
        }
      />
    );
  }

  const displayProducts = filteredProducts.length > 0 ? filteredProducts : products;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {displayProducts.map((product, index) => (
          <Card 
            key={product.id} 
            className="group hover:shadow-lg transition-smooth cursor-pointer overflow-hidden"
            onClick={() => onViewProduct(product.id)}
          >
            <div className="relative stable-image">
              {product.images && product.images[0] && (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  width={300}
                  height={192}
                  className="w-full h-32 sm:h-40 lg:h-48 object-cover rounded-t-lg group-hover:scale-105 transition-transform duration-300 ease-out"
                  style={{
                    backfaceVisibility: 'hidden',
                    willChange: 'transform',
                    objectFit: 'cover'
                  }}
                  loading={index < 4 ? 'eager' : 'lazy'}
                />
              )}
              
              {/* Condition Badge */}
              <Badge 
                className="absolute top-1 left-1 sm:top-2 sm:left-2 text-xs"
                variant={product.condition === 'new' ? 'default' : 'secondary'}
              >
                {product.condition?.charAt(0).toUpperCase() + product.condition?.slice(1) || 'Good'}
              </Badge>
            </div>

            <CardContent className="p-2 sm:p-3 lg:p-4">
              <div className="mb-2">
                <h3 className="font-semibold text-sm sm:text-base lg:text-lg line-clamp-2 min-h-[2.5rem]">{product.title}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2 mb-1 sm:mb-2 hidden sm:block">
                  {product.description}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
                <Badge variant="outline" className="text-xs w-fit">
                  {product.category}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{product.seller?.campus || product.campus || 'Unknown Campus'}</span>
                </div>
              </div>

              {/* Seller Info */}
              <div 
                className="flex items-center gap-1 sm:gap-2 mb-2 sm:mb-3 text-xs cursor-pointer hover:text-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/seller/${product.seller_id}`);
                }}
              >
                <span className="truncate underline text-primary font-medium">by {product.seller?.full_name || 'Unknown Seller'}</span>
                {product.seller?.is_verified && (
                  <div className="bg-blue-500 rounded-full p-0.5 flex-shrink-0">
                    <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span>{product.seller?.rating?.toFixed(1) || '0.0'}</span>
                </div>
              </div>

              <div className="text-base sm:text-lg lg:text-xl font-bold text-primary">
                ₦{product.price.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {isAuthenticated && products.length > 0 && (
        <div className="text-center mt-8">
          <Button variant="default" size="sm" className="sm:size-default" asChild>
            <Link to={ROUTES.sell}>Start Selling</Link>
          </Button>
        </div>
      )}
    </>
  );
};