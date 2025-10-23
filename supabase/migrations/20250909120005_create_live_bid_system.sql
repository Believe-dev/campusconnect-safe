-- Create live bid system tables
CREATE TABLE IF NOT EXISTS public.live_bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    campus VARCHAR(255),
    condition VARCHAR(50) DEFAULT 'good',
    images TEXT[] DEFAULT '{}',
    starting_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    current_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    reserve_price DECIMAL(10,2),
    bid_increment DECIMAL(10,2) DEFAULT 10.00,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    auto_extend BOOLEAN DEFAULT true,
    extension_minutes INTEGER DEFAULT 5,
    winner_id UUID REFERENCES auth.users(id),
    total_bids INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bids table for individual bid records
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    live_bid_id UUID NOT NULL REFERENCES public.live_bids(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    is_auto_bid BOOLEAN DEFAULT false,
    max_auto_bid DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(live_bid_id, bidder_id, amount, created_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_bids_status ON public.live_bids(status);
CREATE INDEX IF NOT EXISTS idx_live_bids_end_time ON public.live_bids(end_time);
CREATE INDEX IF NOT EXISTS idx_live_bids_seller_id ON public.live_bids(seller_id);
CREATE INDEX IF NOT EXISTS idx_live_bids_category ON public.live_bids(category);
CREATE INDEX IF NOT EXISTS idx_live_bids_campus ON public.live_bids(campus);
CREATE INDEX IF NOT EXISTS idx_bids_live_bid_id ON public.bids(live_bid_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON public.bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON public.bids(created_at DESC);

-- Enable RLS
ALTER TABLE public.live_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- RLS policies for live_bids
CREATE POLICY "Anyone can view active live bids" ON public.live_bids
    FOR SELECT USING (status = 'active');

CREATE POLICY "Sellers can view their own live bids" ON public.live_bids
    FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Approved sellers can create live bids" ON public.live_bids
    FOR INSERT WITH CHECK (
        auth.uid() = seller_id AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() 
            AND account_type = 'seller' 
            AND seller_status = 'approved'
        )
    );

CREATE POLICY "Sellers can update their own live bids" ON public.live_bids
    FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own live bids" ON public.live_bids
    FOR DELETE USING (auth.uid() = seller_id);

-- RLS policies for bids
CREATE POLICY "Anyone can view bids on active auctions" ON public.bids
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.live_bids 
            WHERE id = live_bid_id AND status = 'active'
        )
    );

CREATE POLICY "Authenticated users can place bids" ON public.bids
    FOR INSERT WITH CHECK (
        auth.uid() = bidder_id AND
        EXISTS (
            SELECT 1 FROM public.live_bids 
            WHERE id = live_bid_id 
            AND status = 'active' 
            AND end_time > NOW()
            AND seller_id != auth.uid()
        )
    );

-- Function to update live bid current price and total bids
CREATE OR REPLACE FUNCTION update_live_bid_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current price and total bids count
    UPDATE public.live_bids 
    SET 
        current_price = NEW.amount,
        total_bids = total_bids + 1,
        updated_at = NOW(),
        -- Auto-extend if within extension window
        end_time = CASE 
            WHEN auto_extend = true 
            AND NEW.created_at > (end_time - INTERVAL '5 minutes')
            AND end_time > NOW()
            THEN end_time + INTERVAL '5 minutes'
            ELSE end_time
        END
    WHERE id = NEW.live_bid_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update live bid stats when new bid is placed
CREATE TRIGGER update_live_bid_stats_trigger
    AFTER INSERT ON public.bids
    FOR EACH ROW
    EXECUTE FUNCTION update_live_bid_stats();

-- Function to end expired auctions
CREATE OR REPLACE FUNCTION end_expired_auctions()
RETURNS void AS $$
BEGIN
    -- Update expired auctions and set winner
    UPDATE public.live_bids 
    SET 
        status = 'ended',
        winner_id = (
            SELECT bidder_id 
            FROM public.bids 
            WHERE live_bid_id = live_bids.id 
            ORDER BY amount DESC, created_at ASC 
            LIMIT 1
        ),
        updated_at = NOW()
    WHERE status = 'active' 
    AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to validate bid amount
CREATE OR REPLACE FUNCTION validate_bid_amount()
RETURNS TRIGGER AS $$
DECLARE
    auction_record RECORD;
    highest_bid DECIMAL(10,2);
BEGIN
    -- Get auction details
    SELECT * INTO auction_record 
    FROM public.live_bids 
    WHERE id = NEW.live_bid_id;
    
    -- Check if auction is still active
    IF auction_record.status != 'active' OR auction_record.end_time <= NOW() THEN
        RAISE EXCEPTION 'Auction is no longer active';
    END IF;
    
    -- Check if bidder is not the seller
    IF auction_record.seller_id = NEW.bidder_id THEN
        RAISE EXCEPTION 'Sellers cannot bid on their own auctions';
    END IF;
    
    -- Get current highest bid
    SELECT COALESCE(MAX(amount), auction_record.starting_price) INTO highest_bid
    FROM public.bids 
    WHERE live_bid_id = NEW.live_bid_id;
    
    -- Validate bid amount
    IF NEW.amount <= highest_bid THEN
        RAISE EXCEPTION 'Bid must be higher than current highest bid of %', highest_bid;
    END IF;
    
    -- Check minimum increment
    IF NEW.amount < (highest_bid + auction_record.bid_increment) THEN
        RAISE EXCEPTION 'Bid must be at least % higher than current bid', auction_record.bid_increment;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate bid amount
CREATE TRIGGER validate_bid_amount_trigger
    BEFORE INSERT ON public.bids
    FOR EACH ROW
    EXECUTE FUNCTION validate_bid_amount();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_bids TO authenticated;
GRANT SELECT, INSERT ON public.bids TO authenticated;
GRANT USAGE ON SEQUENCE live_bids_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE bids_id_seq TO authenticated;