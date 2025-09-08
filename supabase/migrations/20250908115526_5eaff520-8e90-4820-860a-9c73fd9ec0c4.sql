-- Enable realtime for product_analytics
ALTER TABLE product_analytics REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE product_analytics;

-- Function to update product analytics
CREATE OR REPLACE FUNCTION update_product_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    analytics_record RECORD;
BEGIN
    -- Get or create analytics record for the product
    SELECT * INTO analytics_record
    FROM product_analytics 
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);
    
    IF NOT FOUND THEN
        INSERT INTO product_analytics (product_id)
        VALUES (COALESCE(NEW.product_id, OLD.product_id))
        RETURNING * INTO analytics_record;
    END IF;

    -- Handle different table triggers
    IF TG_TABLE_NAME = 'favorites' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE product_analytics 
            SET favorites_count = favorites_count + 1,
                last_updated = now()
            WHERE product_id = NEW.product_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE product_analytics 
            SET favorites_count = GREATEST(0, favorites_count - 1),
                last_updated = now()
            WHERE product_id = OLD.product_id;
        END IF;
        
    ELSIF TG_TABLE_NAME = 'cart' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE product_analytics 
            SET cart_additions = cart_additions + 1,
                last_updated = now()
            WHERE product_id = NEW.product_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE product_analytics 
            SET cart_additions = GREATEST(0, cart_additions - 1),
                last_updated = now()
            WHERE product_id = OLD.product_id;
        END IF;
        
    ELSIF TG_TABLE_NAME = 'orders' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE product_analytics 
            SET orders_count = orders_count + NEW.quantity,
                revenue = revenue + NEW.total_amount,
                last_updated = now()
            WHERE product_id = NEW.product_id;
        ELSIF TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
            -- Order confirmed, update analytics
            UPDATE product_analytics 
            SET last_updated = now()
            WHERE product_id = NEW.product_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create triggers for real-time analytics updates
DROP TRIGGER IF EXISTS favorites_analytics_trigger ON favorites;
CREATE TRIGGER favorites_analytics_trigger
    AFTER INSERT OR DELETE ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_product_analytics();

DROP TRIGGER IF EXISTS cart_analytics_trigger ON cart;
CREATE TRIGGER cart_analytics_trigger
    AFTER INSERT OR DELETE ON cart
    FOR EACH ROW EXECUTE FUNCTION update_product_analytics();

DROP TRIGGER IF EXISTS orders_analytics_trigger ON orders;
CREATE TRIGGER orders_analytics_trigger
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_product_analytics();

-- Function to track product views
CREATE OR REPLACE FUNCTION track_product_view(p_product_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert or update product analytics for views
    INSERT INTO product_analytics (product_id, views, last_updated)
    VALUES (p_product_id, 1, now())
    ON CONFLICT (product_id)
    DO UPDATE SET 
        views = product_analytics.views + 1,
        last_updated = now();
END;
$$;