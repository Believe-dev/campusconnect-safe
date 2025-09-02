import { Star, MapPin, Badge, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  campus: string;
  condition: string;
  seller: {
    full_name: string;
    rating: number;
    is_verified: boolean;
  };
}

interface ProductCardProps {
  product: Product;
  onViewProduct: (productId: string) => void;
  onMessageSeller: (productId: string) => void;
  isAuthenticated?: boolean;
}

const ProductCard = ({ product, onViewProduct, onMessageSeller, isAuthenticated = false }: ProductCardProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(price);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new':
        return 'bg-success/10 text-success border-success/20';
      case 'like_new':
        return 'bg-verified-blue/10 text-verified-blue border-verified-blue/20';
      case 'good':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'fair':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Card className="group hover:shadow-card transition-smooth overflow-hidden cursor-pointer" onClick={() => onViewProduct(product.id)}>
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-smooth"
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <span className="text-muted-foreground">No Image</span>
          </div>
        )}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium border ${getConditionColor(product.condition)}`}>
          {product.condition.replace('_', ' ')}
        </div>
      </div>

      <CardContent className="p-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-2">
            {product.title}
          </h3>
          <div className="font-bold text-lg text-university-green">
            {formatPrice(product.price)}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{product.campus}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1 text-xs">
            <span className="font-medium truncate max-w-[80px]">{product.seller.full_name}</span>
            {product.seller.is_verified && (
              <Badge className="h-3 w-3 text-verified-blue" />
            )}
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-warning text-warning" />
              <span>{product.seller.rating.toFixed(1)}</span>
            </div>
          </div>
          
          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMessageSeller(product.id);
              }}
              className="h-7 px-2"
            >
              <MessageCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;