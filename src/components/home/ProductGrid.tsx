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
            className="group hover:shadow-lg transition-shadow duration-200 cursor-pointer overflow-hidden border-0 shadow-sm"
            onClick={() => onViewProduct(product.id)}
          >
            <div className="relative">
              {product.images && product.images[0] && (
                <img
                  src={product.images[0]}
                  alt={product.title}
                  width={300}
                  height={192}
                  className="w-full h-32 sm:h-40 md:h-44 lg:h-48 object-cover"
                  loading={index < 4 ? 'eager' : 'lazy'}
                />
              )}
              
              <Badge 
                className={`absolute top-2 left-2 text-xs px-2 py-1 ${
                  product.condition === 'new' 
                    ? 'bg-green-500 text-white' 
                    : product.condition === 'like-new'
                    ? 'bg-blue-500 text-white'
                    : 'bg-orange-500 text-white'
                }`}
              >
                {product.condition?.charAt(0).toUpperCase() + product.condition?.slice(1) || 'Good'}
              </Badge>
            </div>

            <CardContent className="p-3 sm:p-4">
              <div className="mb-2">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-2 text-gray-900 mb-1">
                  {product.title}
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm line-clamp-1 hidden sm:block">
                  {product.description}
                </p>
              </div>

              <div className="flex flex-col gap-2 mb-3">
                <Badge variant="outline" className="text-xs w-fit">
                  {product.category}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{product.seller?.campus || product.campus || 'Unknown Campus'}</span>
                </div>
              </div>

              <div 
                className="flex items-center gap-2 mb-3 text-xs cursor-pointer hover:text-primary transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/seller/${product.seller_id}`);
                }}
              >
                <div className="w-5 h-5 rounded-full bg-university-green/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-university-green">
                    {product.seller?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="font-medium text-gray-700 truncate flex-1">
                  {product.seller?.full_name || 'Unknown Seller'}
                </span>
                {product.seller?.is_verified && (
                  <div className="bg-blue-500 rounded-full p-0.5 flex-shrink-0">
                    <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-gray-600">
                    {product.seller?.rating?.toFixed(1) || '0.0'}
                  </span>
                </div>
              </div>

              <div className="text-base sm:text-lg font-bold text-university-green">
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