-- Add referral code to profiles table
ALTER TABLE profiles 
ADD COLUMN referral_code TEXT UNIQUE,
ADD COLUMN total_referrals INTEGER DEFAULT 0;

-- Create referrals table
CREATE TABLE referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(referred_id) -- One referral per user
);

-- Create indexes for performance
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_profiles_referral_code ON profiles(referral_code);

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user signup with referral
CREATE OR REPLACE FUNCTION handle_referral_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate referral code for new user
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to generate referral code on profile creation
CREATE TRIGGER trigger_generate_referral_code
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_referral_signup();

-- Function to complete referral
CREATE OR REPLACE FUNCTION complete_referral(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Mark referral as completed and update referrer count
  UPDATE referrals 
  SET status = 'completed', completed_at = NOW()
  WHERE referred_id = user_id AND status = 'pending';
  
  -- Update referrer's total count
  UPDATE profiles 
  SET total_referrals = total_referrals + 1
  WHERE user_id IN (
    SELECT referrer_id FROM referrals 
    WHERE referred_id = user_id AND status = 'completed'
  );
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals" ON referrals
  FOR SELECT USING (referrer_id = auth.uid() OR referred_id = auth.uid());

CREATE POLICY "Users can insert referrals" ON referrals
  FOR INSERT WITH CHECK (referred_id = auth.uid());

-- Update existing users with referral codes
UPDATE profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;