import { Star, MapPin, Badge, MessageCircle, ShoppingCart, Ruler } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { LowMemoryImage } from '@/components/ui/LowMemoryImage';
import { useMemoryOptimization } from '@/hooks/useMemoryOptimization';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { sanitizeInput, secureLog } from '@/utils/security';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { SizeSelector } from '@/components/marketplace/SizeSelector';

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
  stock_quantity: number;
  available_sizes?: string[];
  seller: {
    full_name: string;
    business_name?: string;
    rating: number;
    is_verified: boolean;
    campus?: string;
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
  const { isLowMemory } = useMemoryOptimization();
  const [isInCart, setIsInCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [showSizeSelector, setShowSizeSelector] = useState(false);

  useEffect(() => {
    if (user && product) {
      checkCartStatus();
    }
  }, [user, product]);

  const checkCartStatus = async () => {
    if (!user || !product) return;
    
    try {
      const { data } = await supabase
        .from('cart')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .single();

      setIsInCart(!!data);
    } catch (error) {
      setIsInCart(false);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isInCart) return; // Prevent action if already in cart
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    // Check if product has sizes and none is selected
    if (product.available_sizes && product.available_sizes.length > 0 && !selectedSize) {
      setShowSizeSelector(true);
      return;
    }

    try {
      const { data: existingItem } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .maybeSingle();

      if (existingItem) {
        // Check if adding one more would exceed stock
        if (existingItem.quantity >= (product as any).stock_quantity) {
          toast({
            title: "Stock Limit Reached",
            description: "Cannot add more items than available stock",
            variant: "destructive",
          });
          return;
        }

        // Optimistic update
        if (window.updateCartCountOptimistically) {
          window.updateCartCountOptimistically(1);
        }
        setIsInCart(true);
        toast({
          title: "Added to Cart",
          description: "Item added to your cart",
        });

        const { error } = await supabase
          .from('cart')
          .update({ 
            quantity: existingItem.quantity + 1,
            selected_size: selectedSize || existingItem.selected_size,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id);

        if (error) {
          // Revert optimistic update
          if (window.updateCartCountOptimistically) {
            window.updateCartCountOptimistically(-1);
          }
          setIsInCart(false);
          throw error;
        }
      } else {
        // Optimistic update
        if (window.updateCartCountOptimistically) {
          window.updateCartCountOptimistically(1);
        }
        setIsInCart(true);
        toast({
          title: "Added to Cart",
          description: "Item added to your cart",
        });

        const { error } = await supabase
          .from('cart')
          .insert({
            user_id: user.id,
            product_id: product.id,
            quantity: 1,
            selected_size: selectedSize
          });

        if (error) {
          // Revert optimistic update
          if (window.updateCartCountOptimistically) {
            window.updateCartCountOptimistically(-1);
          }
          setIsInCart(false);
          throw error;
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

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
      // Use the database function to find or create a consolidated conversation
      const { data: conversationId, error: functionError } = await supabase.rpc(
        'find_or_create_consolidated_conversation',
        {
          p_buyer_id: user.id,
          p_seller_id: product.seller_id,
          p_product_id: product.id
        }
      );

      if (functionError || !conversationId) {
        secureLog.error('Error finding/creating conversation', functionError);
        toast({
          title: "Error",
          description: "Failed to start conversation. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to messages with the conversation ID and product draft
      const draftMessage = `Hi! I'm interested in your ${product.title} listed for ${formatPrice(product.price)}. Is it still available?`;
      navigate(`/messages?conversation=${conversationId}&draft=${encodeURIComponent(draftMessage)}`);

    } catch (error) {
      secureLog.error('Error in handleMessageSeller', error);
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
    <Card className={`group student-card overflow-hidden cursor-pointer relative flex flex-col h-full ${isLowMemory ? 'low-memory' : 'micro-bounce transition-all duration-200 hover:scale-[1.02] hover:shadow-lg'}`} onClick={() => onViewProduct(product.id)}>
      <div className="relative aspect-square overflow-hidden bg-muted stable-image">
        {product?.images?.[0] ? (
          <LowMemoryImage
            src={product.images[0]}
            alt={product.title}
            width={300}
            height={300}
            className={isLowMemory ? '' : 'group-hover:scale-105 transition-transform duration-300 ease-out'}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted to-muted/50" style={{ width: 300, height: 300 }}>
            <span className="text-xs sm:text-sm text-muted-foreground font-medium">No Image</span>
          </div>
        )}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold border backdrop-blur-sm ${getConditionColor(product?.condition || 'good')} shadow-sm`}>
          {(product?.condition || 'good').replace('_', ' ').toUpperCase()}
        </div>
        
        {/* Hover Actions - Hidden on mobile for better touch experience */}
        {showHoverActions && isAuthenticated && (
          <div className="absolute inset-x-1 bottom-1 sm:inset-x-2 sm:bottom-2 flex gap-1 sm:gap-2 opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
            <Button 
              size="sm" 
              variant={isInCart ? "outline" : "brand"} 
              className="flex-1 h-7 sm:h-8 text-xs"
              onClick={handleAddToCart}
              disabled={isInCart}
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">
                {isInCart ? "In Cart" : (product.available_sizes && product.available_sizes.length > 0 && !selectedSize ? "Select Size" : "Add to Cart")}
              </span>
              <span className="sm:hidden">
                {isInCart ? "In Cart" : (product.available_sizes && product.available_sizes.length > 0 && !selectedSize ? "Size" : "Add")}
              </span>
            </Button>
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

      <CardContent className="p-2 sm:p-3 flex-1 flex flex-col">
        <div className="space-y-1 sm:space-y-2 flex-1">
          <h3 className="font-semibold text-sm sm:text-base leading-tight line-clamp-3 min-h-[3rem] sm:min-h-[3.5rem]">
            {sanitizeInput(product?.title || 'Unknown Product')}
          </h3>
          <div className="font-bold text-base sm:text-lg bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            {formatPrice(product?.price || 0)}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{sanitizeInput(product?.seller?.campus || product?.campus || 'Unknown Campus')}</span>
          </div>
          
          {/* Size Selection */}
          {product.available_sizes && product.available_sizes.length > 0 && (
            <div className="mt-2">
              {showSizeSelector ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium flex items-center gap-1">
                    <Ruler className="h-3 w-3" />
                    Select Size:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {product.available_sizes.map((size) => (
                      <Button
                        key={size}
                        variant={selectedSize === size ? "default" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSize(size);
                          setShowSizeSelector(false);
                        }}
                      >
                        {size}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Ruler className="h-3 w-3" />
                  {selectedSize ? (
                    <span>Size: <span className="font-medium">{selectedSize}</span></span>
                  ) : (
                    <span>Available sizes: {product.available_sizes.join(', ')}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-2 sm:p-3 pt-0 mt-auto">
        <div className="flex items-center justify-between w-full gap-2">
          <div 
            className="flex items-center gap-1 text-xs cursor-pointer hover:text-primary transition-colors min-w-0 flex-1"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/seller/${product.seller_id}`);
            }}
          >
            <span className="font-medium truncate max-w-[60px] sm:max-w-[80px] underline hover:no-underline text-primary">
              {sanitizeInput(product.seller?.business_name || product.seller?.full_name || 'Unknown Seller')}
            </span>
            {product.seller?.is_verified && (
              <>
                <div className="verification-badge-inline flex-shrink-0" style={{ width: '12px', height: '12px' }}>
                  <svg fill="currentColor" viewBox="0 0 20 20" style={{ width: '6px', height: '6px' }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </>
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