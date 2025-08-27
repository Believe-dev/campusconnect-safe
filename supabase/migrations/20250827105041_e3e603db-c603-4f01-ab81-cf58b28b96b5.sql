-- Create cart table for shopping cart functionality
CREATE TABLE public.cart (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create favorites table for wishlist functionality
CREATE TABLE public.favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create product_analytics table for seller insights
CREATE TABLE public.product_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0,
  favorites_count INTEGER NOT NULL DEFAULT 0,
  cart_additions INTEGER NOT NULL DEFAULT 0,
  orders_count INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Enable RLS on new tables
ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

-- Cart policies
CREATE POLICY "Users can manage their own cart"
ON public.cart
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Favorites policies
CREATE POLICY "Users can manage their own favorites"
ON public.favorites
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Product analytics policies
CREATE POLICY "Anyone can view product analytics"
ON public.product_analytics
FOR SELECT
USING (true);

CREATE POLICY "Sellers can view their product analytics"
ON public.product_analytics
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_analytics.product_id 
  AND products.seller_id = auth.uid()
));

-- Triggers for updated_at
CREATE TRIGGER update_cart_updated_at
BEFORE UPDATE ON public.cart
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Initialize analytics for existing products
INSERT INTO public.product_analytics (product_id, views, favorites_count, cart_additions, orders_count, revenue)
SELECT id, 0, 0, 0, 0, 0 FROM public.products
ON CONFLICT (product_id) DO NOTHING;