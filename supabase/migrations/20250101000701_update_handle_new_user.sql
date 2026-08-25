-- Update handle_new_user function to process referrals
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referral_code_param TEXT;
BEGIN
  -- Extract referral code from user metadata
  referral_code_param := NEW.raw_user_meta_data->>'referral_code';
  
  -- Insert profile with referral code generation
  INSERT INTO profiles (
    user_id,
    email,
    full_name,
    university_name,
    campus,
    student_id,
    phone_number,
    business_name,
    account_type,
    bio,
    seller_status,
    avatar_url,
    student_id_photo_url
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'university_name',
    COALESCE(NEW.raw_user_meta_data->>'campus', NEW.raw_user_meta_data->>'university_name'),
    NEW.raw_user_meta_data->>'student_id',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'business_name',
    COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer'),
    NEW.raw_user_meta_data->>'bio',
    CASE 
      WHEN NEW.raw_user_meta_data->>'account_type' = 'seller' THEN 'pending'
      ELSE NULL
    END,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'student_id_photo_url'
  );

  -- Create wallet for all users
  INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Process referral if provided
  IF referral_code_param IS NOT NULL AND referral_code_param != '' THEN
    -- Find referrer
    INSERT INTO referrals (referrer_id, referred_id, status)
    SELECT user_id, NEW.id, 'pending'
    FROM profiles 
    WHERE referral_code = upper(referral_code_param)
    AND user_id != NEW.id
    LIMIT 1
    ON CONFLICT (referred_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;