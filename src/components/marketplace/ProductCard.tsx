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
}

const ProductCard = ({ product, onViewProduct, onMessageSeller }: ProductCardProps) => {
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
    <Card className="group hover:shadow-card transition-smooth overflow-hidden">
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

      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg leading-tight line-clamp-2">
            {product.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.description}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{product.campus}</span>
            <span className="text-accent">•</span>
            <span className="capitalize">{product.category}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0 space-y-3">
        <div className="flex items-center justify-between w-full">
          <div className="space-y-1">
            <div className="font-bold text-xl text-university-green">
              {formatPrice(product.price)}
            </div>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">by</span>
              <span className="font-medium">{product.seller.full_name}</span>
              {product.seller.is_verified && (
                <Badge className="h-3 w-3 text-verified-blue" />
              )}
              <div className="flex items-center gap-1 ml-1">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span className="text-xs">{product.seller.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onMessageSeller(product.id)}
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </Button>
          <Button
            variant="marketplace"
            size="sm"
            className="flex-1"
            onClick={() => onViewProduct(product.id)}
          >
            View Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProductCard;