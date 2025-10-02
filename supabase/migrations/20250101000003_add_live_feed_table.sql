-- Create live_feed table for temporary items (24-hour expiry)
CREATE TABLE IF NOT EXISTS live_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  condition TEXT DEFAULT 'new',
  campus TEXT,
  is_sold BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_live_feed_seller_id ON live_feed(seller_id);
CREATE INDEX idx_live_feed_expires_at ON live_feed(expires_at);
CREATE INDEX idx_live_feed_created_at ON live_feed(created_at DESC);
CREATE INDEX idx_live_feed_active ON live_feed(expires_at, is_sold) WHERE is_sold = false;

-- Enable RLS
ALTER TABLE live_feed ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active live feed items" ON live_feed
  FOR SELECT USING (is_sold = false);

CREATE POLICY "Sellers can manage their own live feed items" ON live_feed
  FOR ALL USING (auth.uid() = seller_id);

-- Create updated_at trigger
CREATE TRIGGER update_live_feed_updated_at
  BEFORE UPDATE ON live_feed
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired items
CREATE OR REPLACE FUNCTION cleanup_expired_live_feed()
RETURNS void AS $$
BEGIN
  DELETE FROM live_feed 
  WHERE expires_at <= NOW() AND is_sold = false;
END;
$$ LANGUAGE plpgsql;