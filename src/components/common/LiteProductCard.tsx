import React, { memo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/lib/types';
import { useLiteMode } from '@/hooks/useLiteMode';

interface LiteProductCardProps {
  product: Product;
  onViewProduct: (id: string) => void;
  index: number;
}

export const LiteProductCard = memo<LiteProductCardProps>(({ 
  product, 
  onViewProduct, 
  index 
}) => {
  const { isLiteMode } = useLiteMode();
  
  const handleClick = useCallback(() => {
    onViewProduct(product.id);
  }, [product.id, onViewProduct]);

  return (
    <Card 
      className={`product-card cursor-pointer ${isLiteMode ? 'lite-mode-card' : 'group hover:shadow-lg transition-smooth'}`}
      onClick={handleClick}
    >
      <div className="relative">
        {product.images?.[0] && (
          <img
            src={product.images[0]}
            alt={product.title}
            className={`w-full h-32 sm:h-40 object-cover rounded-t-lg ${
              isLiteMode ? '' : 'group-hover:scale-105 transition-transform duration-300'
            }`}
            loading={index < 4 ? 'eager' : 'lazy'}
            {...(isLiteMode && { 
              style: { imageRendering: 'pixelated' }
            })}
          />
        )}
        <Badge className="absolute top-2 left-2 text-xs">
          {product.condition || 'Good'}
        </Badge>
      </div>

      <CardContent className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2">{product.title}</h3>
        <div className="text-lg font-bold text-primary mt-2">
          ₦{product.price.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
});