import { Star, MapPin, Badge, MessageCircle, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface ProductCardProps {
  product: Product;
  onViewProduct: (productId: string) => void;
  onAddToCart?: (productId: string) => void;
  isAuthenticated?: boolean;
  showHoverActions?: boolean;
}

const ProductCard = ({ 
  product, 
  onViewProduct, 
  onAddToCart,
  isAuthenticated = false,
  showHoverActions = false
}: ProductCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleMessageSeller = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to message the seller",
        variant: "destructive",
      });
      return;
    }

    if (user.id === product.seller_id) {
      toast({
        title: "Cannot Message Yourself",
        description: "You cannot message yourself about your own product",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use the new function to find or create a consolidated conversation between buyer and seller
      const { data: conversationId, error: functionError } = await supabase.rpc(
        'find_or_create_conversation',
        {
          p_buyer_id: user.id,
          p_seller_id: product.seller_id,
          p_product_id: product.id
        }
      );

      if (functionError) {
        console.error('Error finding/creating conversation:', functionError);
        toast({
          title: "Error",
          description: "Failed to start conversation. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to messages with the conversation ID
      navigate(`/messages?conversation=${conversationId}`);

    } catch (error) {
      console.error('Error in handleMessageSeller:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };
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

  if (!product) {
    return null;
  }

  return (
    <Card className="group hover:shadow-card transition-smooth overflow-hidden cursor-pointer relative" onClick={() => onViewProduct(product.id)}>
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product?.images?.[0] ? (
          <OptimizedImage
            src={product.images[0]}
            alt={product.title}
            className="w-full h-full group-hover:scale-105 transition-smooth"
            quality={60}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted">
            <span className="text-xs sm:text-sm text-muted-foreground">No Image</span>
          </div>
        )}
        <div className={`absolute top-1 right-1 sm:top-2 sm:right-2 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full text-xs font-medium border ${getConditionColor(product?.condition || 'good')}`}>
          {(product?.condition || 'good').replace('_', ' ')}
        </div>
        
        {/* Hover Actions - Hidden on mobile for better touch experience */}
        {showHoverActions && isAuthenticated && (
          <div className="absolute inset-x-1 bottom-1 sm:inset-x-2 sm:bottom-2 flex gap-1 sm:gap-2 opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
            {onAddToCart && (
              <Button 
                size="sm" 
                variant="brand" 
                className="flex-1 h-7 sm:h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product.id);
                }}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                <span className="hidden sm:inline">Add to Cart</span>
                <span className="sm:hidden">Add</span>
              </Button>
            )}
            {/* Message Seller Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleMessageSeller();
              }}
              className="flex-1 h-7 sm:h-8 text-xs"
            >
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Message</span>
              <span className="sm:hidden">Chat</span>
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-2 sm:p-3">
        <div className="space-y-1 sm:space-y-2">
          <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-2">
            {product?.title || 'Unknown Product'}
          </h3>
          <div className="font-bold text-base sm:text-lg text-university-green">
            {formatPrice(product?.price || 0)}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{product?.campus || 'Unknown Campus'}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-2 sm:p-3 pt-0">
        <div className="flex items-center justify-between w-full gap-2">
          <div 
            className="flex items-center gap-1 text-xs cursor-pointer hover:text-primary transition-colors min-w-0 flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/seller/${product.seller_id}`);
            }}
          >
            <span className="font-medium truncate max-w-[60px] sm:max-w-[80px]">
              {product.seller?.full_name || 'Unknown Seller'}
            </span>
            {product.seller?.is_verified && (
              <div className="h-3 w-3 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="h-2 w-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            {product.seller?.rating && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span>{product.seller.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleMessageSeller();
              }}
              className="h-6 w-6 sm:h-7 sm:w-7 p-0 flex-shrink-0"
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