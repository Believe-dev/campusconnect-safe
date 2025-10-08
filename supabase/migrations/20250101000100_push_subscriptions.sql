-- Create push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Create function to clean up old subscriptions
CREATE OR REPLACE FUNCTION cleanup_old_push_subscriptions()
RETURNS void AS $$
BEGIN
    DELETE FROM push_subscriptions 
    WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_push_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER push_subscriptions_updated_at_trigger
    BEFORE UPDATE ON push_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_push_subscriptions_updated_at();