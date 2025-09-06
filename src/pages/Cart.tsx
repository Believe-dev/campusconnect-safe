import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { SAFE_PROFILE_SELECT } from '@/lib/profileSecurity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart,
  ArrowRight,
  Package,
  Heart,
  MessageCircle
} from 'lucide-react';
import Header from '@/components/layout/Header';
import ProductCard from '@/components/marketplace/ProductCard';
import { User } from '@supabase/supabase-js';

interface CartItem {
  id: string;
  quantity: number;
  product_id: string;
  products: {
    id: string;
    title: string;
    description: string;
    price: number;
    stock_quantity: number;
    condition: string;
    category: string;
    campus: string;
    images: string[];
    seller_id: string;
    profiles: {
      full_name: string;
      rating: number;
      is_verified: boolean;
    };
  };
}

interface CartProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  campus: string;
  condition: string;
  images: string[];
  seller_id: string;
  stock_quantity: number;
  seller: {
    full_name: string;
    rating: number;
    is_verified: boolean;
  };
}

const Cart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<CartProduct[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRecommended, setLoadingRecommended] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      await fetchCartItems(user.id);
    } catch (error) {
      console.error('Error checking auth:', error);
      navigate('/auth');
    }
  };

  const fetchCartItems = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('cart')
        .select(`
          *,
          products (
            *,
            profiles!products_seller_id_fkey (
              full_name,
              rating,
              is_verified
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCartItems(data || []);
      
      // Fetch recommended products after cart items are loaded
      await fetchRecommendedProducts(data || []);
    } catch (error) {
      console.error('Error fetching cart items:', error);
      toast({
        title: "Error",
        description: "Failed to load cart items",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendedProducts = async (currentCartItems: CartItem[]) => {
    setLoadingRecommended(true);
    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          profiles!products_seller_id_fkey (
            full_name,
            avatar_url,
            is_verified,
            rating
          )
        `)
        .eq('is_active', true)
        .limit(8);

      if (currentCartItems.length > 0) {
        // Get categories from cart items for "You might also like"
        const categories = [...new Set(currentCartItems.map(item => item.products.category))];
        const productIds = currentCartItems.map(item => item.products.id);
        
        query = query
          .in('category', categories)
          .not('id', 'in', `(${productIds.join(',')})`)
          .order('created_at', { ascending: false });
      } else {
        // Get popular/recent products for empty cart
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform the data to match our Product interface
      const transformedData = (data || []).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || '',
        price: item.price,
        category: item.category,
        campus: item.campus || 'Unknown Campus',
        condition: item.condition,
        images: item.images || [],
        seller_id: item.seller_id,
        stock_quantity: item.stock_quantity,
        seller: item.profiles ? {
          full_name: item.profiles.full_name,
          rating: item.profiles.rating,
          is_verified: item.profiles.is_verified
        } : {
          full_name: 'Unknown Seller',
          rating: 0,
          is_verified: false
        }
      }));

      setRecommendedProducts(transformedData);
    } catch (error) {
      console.error('Error fetching recommended products:', error);
    } finally {
      setLoadingRecommended(false);
    }
  };

  const updateQuantity = async (cartItemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const { error } = await supabase
        .from('cart')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId);

      if (error) throw error;

      setCartItems(items => 
        items.map(item => 
          item.id === cartItemId 
            ? { ...item, quantity: newQuantity }
            : item
        )
      );
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    }
  };

  const removeFromCart = async (cartItemId: string) => {
    try {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;

      setCartItems(items => items.filter(item => item.id !== cartItemId));
      
      toast({
        title: "Item removed",
        description: "Item removed from your cart",
      });
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    }
  };

  const getTotalPrice = () => {
    return cartItems.reduce((total, item) => 
      total + (item.products.price * item.quantity), 0
    );
  };

  const getTotalItems = () => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  };

  const proceedToCheckout = () => {
    if (cartItems.length === 0) {
      toast({
        title: "Empty cart",
        description: "Add some items to your cart first",
        variant: "destructive",
      });
      return;
    }
    navigate('/checkout');
  };

  const handleViewProduct = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  const handleMessageSeller = (sellerId: string) => {
    navigate(`/messages?seller=${sellerId}`);
  };

  const addToCart = async (productId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to add items to cart",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if item already exists in cart
      const { data: existingItem } = await supabase
        .from('cart')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (existingItem) {
        // Update quantity if item exists
        const { error } = await supabase
          .from('cart')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Add new item to cart
        const { error } = await supabase
          .from('cart')
          .insert({
            user_id: user.id,
            product_id: productId,
            quantity: 1
          });

        if (error) throw error;
      }

      toast({
        title: "Added to cart",
        description: "Item added to your cart successfully",
      });

      // Refresh cart items
      if (user) {
        fetchCartItems(user.id);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-8">
            <ShoppingCart className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-primary">Shopping Cart</h1>
            <Badge variant="secondary" className="ml-2">
              {getTotalItems()} {getTotalItems() === 1 ? 'item' : 'items'}
            </Badge>
          </div>

          {cartItems.length === 0 ? (
            <>
              <Card>
                <CardContent className="p-12 text-center">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
                  <p className="text-muted-foreground mb-6">
                    Browse our marketplace to find products you love
                  </p>
                  <Button variant="brand" asChild>
                    <a href="/marketplace">Browse Products</a>
                  </Button>
                </CardContent>
              </Card>

              {/* Recommended Products for Empty Cart */}
              {recommendedProducts.length > 0 && (
                <div className="mt-12">
                  <h2 className="text-2xl font-bold mb-6">Recommended for You</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     {recommendedProducts.slice(0, 4).map((product) => (
                       <div key={product.id} className="relative">
                     <ProductCard
                       product={product}
                       onViewProduct={handleViewProduct}
                       onAddToCart={addToCart}
                       isAuthenticated={!!user}
                       showHoverActions={true}
                     />
                        <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                          <Button 
                            size="sm" 
                            variant="brand" 
                            className="flex-1"
                            onClick={() => addToCart(product.id)}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Add to Cart
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleMessageSeller(product.seller_id)}
                          >
                            <MessageCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {cartItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-6">
                      <div className="flex gap-4">
                        {item.products.images && item.products.images[0] && (
                          <img
                            src={item.products.images[0]}
                            alt={item.products.title}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">{item.products.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                by {item.products.profiles?.full_name}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {item.products.condition}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                disabled={item.quantity >= item.products.stock_quantity}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({item.products.stock_quantity} available)
                              </span>
                            </div>

                            <div className="text-right">
                              <div className="text-lg font-bold">
                                ₦{(item.products.price * item.quantity).toLocaleString()}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                ₦{item.products.price.toLocaleString()} each
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Items ({getTotalItems()})</span>
                      <span>₦{getTotalPrice().toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Delivery</span>
                      <span className="text-muted-foreground">Calculated at checkout</span>
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>₦{getTotalPrice().toLocaleString()}</span>
                      </div>
                    </div>

                    <Button 
                      variant="brand" 
                      className="w-full"
                      onClick={proceedToCheckout}
                    >
                      Proceed to Checkout
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>

                    <Button variant="outline" className="w-full" asChild>
                      <a href="/marketplace">Continue Shopping</a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* You Might Also Like - Only show when cart has items */}
          {cartItems.length > 0 && recommendedProducts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">You Might Also Like</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendedProducts.slice(0, 4).map((product) => (
                  <div key={product.id} className="relative">
                        <ProductCard
                          product={product}
                          onViewProduct={handleViewProduct}
                          onAddToCart={addToCart}
                          isAuthenticated={!!user}
                          showHoverActions={true}
                        />
                    <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                      <Button 
                        size="sm" 
                        variant="brand" 
                        className="flex-1"
                        onClick={() => addToCart(product.id)}
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Add to Cart
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMessageSeller(product.seller_id)}
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Cart;