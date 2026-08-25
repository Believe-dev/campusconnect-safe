-- Create bank_details table for secure storage of user bank information
CREATE TABLE IF NOT EXISTS bank_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_account_name TEXT NOT NULL,
  bank_account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE bank_details ENABLE ROW LEVEL SECURITY;

-- Create policies for bank_details
CREATE POLICY "Users can view their own bank details" ON bank_details
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bank details" ON bank_details
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bank details" ON bank_details
  FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bank_details_updated_at BEFORE UPDATE
    ON bank_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();