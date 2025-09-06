import { Star, MapPin, Badge, MessageCircle, ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
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
      // Check if conversation already exists
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(buyer_id.eq.${user.id},seller_id.eq.${product.seller_id}),and(buyer_id.eq.${product.seller_id},seller_id.eq.${user.id})`)
        .eq('product_id', product.id)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error checking for existing conversation:', fetchError);
        toast({
          title: "Error",
          description: "Failed to start conversation. Please try again.",
          variant: "destructive",
        });
        return;
      }

      let conversationId = existingConversation?.id;

      // Create new conversation if it doesn't exist
      if (!conversationId) {
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            buyer_id: user.id,
            seller_id: product.seller_id,
            product_id: product.id,
          })
          .select('id')
          .single();

        if (createError) {
          console.error('Error creating conversation:', createError);
          toast({
            title: "Error",
            description: "Failed to start conversation. Please try again.",
            variant: "destructive",
          });
          return;
        }

        conversationId = newConversation.id;
      }

      // Navigate to messages
      navigate(`/messages`);
      
      // Set the selected conversation after a short delay to allow navigation
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('selectConversation', { 
          detail: { conversationId } 
        }));
      }, 100);

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
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium border ${getConditionColor(product?.condition || 'good')}`}>
          {(product?.condition || 'good').replace('_', ' ')}
        </div>
        
        {/* Hover Actions */}
        {showHoverActions && isAuthenticated && (
          <div className="absolute inset-x-2 bottom-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {onAddToCart && (
              <Button 
                size="sm" 
                variant="brand" 
                className="flex-1 h-8 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToCart(product.id);
                }}
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Add to Cart
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
              className="flex-1"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Message
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-3">
        <div className="space-y-2">
          <h3 className="font-semibold text-base leading-tight line-clamp-2">
            {product?.title || 'Unknown Product'}
          </h3>
          <div className="font-bold text-lg text-university-green">
            {formatPrice(product?.price || 0)}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{product?.campus || 'Unknown Campus'}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1 text-xs">
            <span className="font-medium truncate max-w-[80px]">
              {product.seller?.full_name || 'Unknown Seller'}
            </span>
            {product.seller?.is_verified && (
              <Badge className="h-3 w-3 text-verified-blue" />
            )}
            {product.seller?.rating && (
              <div className="flex items-center gap-1">
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