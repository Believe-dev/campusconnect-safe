-- Create reviews table and related functionality

-- 1. Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewed_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(order_id, reviewer_id, reviewed_id)
);

-- 2. Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- 3. Create policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reviews' 
        AND policyname = 'Users can view all reviews'
    ) THEN
        CREATE POLICY "Users can view all reviews" ON reviews
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reviews' 
        AND policyname = 'Users can create reviews for their orders'
    ) THEN
        CREATE POLICY "Users can create reviews for their orders" ON reviews
            FOR INSERT WITH CHECK (
                auth.uid() = reviewer_id AND
                EXISTS (
                    SELECT 1 FROM orders 
                    WHERE id = order_id 
                    AND (buyer_id = auth.uid() OR seller_id = auth.uid())
                )
            );
    END IF;
END $$;

-- 4. Create function to update user ratings
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the reviewed user's rating and review count
    UPDATE profiles
    SET 
        rating = (
            SELECT COALESCE(AVG(rating::DECIMAL), 0)
            FROM reviews 
            WHERE reviewed_id = NEW.reviewed_id
        ),
        total_reviews = (
            SELECT COUNT(*)
            FROM reviews 
            WHERE reviewed_id = NEW.reviewed_id
        )
    WHERE user_id = NEW.reviewed_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger
DROP TRIGGER IF EXISTS on_review_created ON reviews;
CREATE TRIGGER on_review_created
    AFTER INSERT ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_user_rating();