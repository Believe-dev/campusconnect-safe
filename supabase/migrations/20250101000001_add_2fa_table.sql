-- Create user_2fa table for two-factor authentication
CREATE TABLE IF NOT EXISTS user_2fa (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  secret TEXT NOT NULL,
  backup_codes TEXT[] DEFAULT '{}',
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_2fa ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own 2FA settings" ON user_2fa
  FOR ALL USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_2fa_updated_at
  BEFORE UPDATE ON user_2fa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();