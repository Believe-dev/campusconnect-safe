-- ====================================================================
-- ANCHOR BAAS VIRTUAL ACCOUNTS & CBN KYC MIGRATION FOR EXISTING USERS
-- ====================================================================

-- 1. Add Anchor Virtual NUBAN and KYC fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS anchor_account_number TEXT,
ADD COLUMN IF NOT EXISTS anchor_bank_name TEXT DEFAULT 'CoreStep Microfinance / Anchor',
ADD COLUMN IF NOT EXISTS bvn_or_nin TEXT,
ADD COLUMN IF NOT EXISTS kyc_tier INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

-- 2. Add Anchor Virtual NUBAN fields to wallets table
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS anchor_account_number TEXT,
ADD COLUMN IF NOT EXISTS anchor_bank_name TEXT DEFAULT 'CoreStep Microfinance / Anchor';

-- 3. Ensure every existing user has a wallet record
INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
SELECT 
    p.user_id,
    0.00,
    0.00,
    0.00,
    0.00
FROM profiles p
WHERE p.user_id NOT IN (SELECT user_id FROM wallets)
ON CONFLICT (user_id) DO NOTHING;

-- 4. Function to auto-generate & sync Anchor Virtual NUBAN accounts for all existing users
CREATE OR REPLACE FUNCTION sync_existing_user_anchor_wallets()
RETURNS INTEGER AS $$
DECLARE
    r RECORD;
    synced_count INTEGER := 0;
    generated_nuban TEXT;
BEGIN
    FOR r IN SELECT user_id FROM profiles LOOP
        -- Generate mock 10-digit NUBAN if user doesn't have one
        SELECT '80' || LPAD(ABS(HASHTEXT(r.user_id::text))::text, 8, '0') INTO generated_nuban;
        
        -- Update profiles
        UPDATE profiles
        SET 
            anchor_account_number = COALESCE(anchor_account_number, generated_nuban),
            anchor_bank_name = COALESCE(anchor_bank_name, 'CoreStep Microfinance / Anchor')
        WHERE user_id = r.user_id AND anchor_account_number IS NULL;

        -- Update wallets
        UPDATE wallets
        SET 
            anchor_account_number = COALESCE(anchor_account_number, generated_nuban),
            anchor_bank_name = COALESCE(anchor_bank_name, 'CoreStep Microfinance / Anchor')
        WHERE user_id = r.user_id AND anchor_account_number IS NULL;

        synced_count := synced_count + 1;
    END LOOP;

    RETURN synced_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run sync immediately for existing users
SELECT sync_existing_user_anchor_wallets();

-- 5. Trigger to automatically assign Anchor Virtual NUBAN on new user creation
CREATE OR REPLACE FUNCTION on_user_created_anchor_setup()
RETURNS TRIGGER AS $$
DECLARE
    generated_nuban TEXT;
BEGIN
    SELECT '80' || LPAD(ABS(HASHTEXT(NEW.user_id::text))::text, 8, '0') INTO generated_nuban;

    -- Ensure wallet exists
    INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, anchor_account_number, anchor_bank_name)
    VALUES (NEW.user_id, 0.00, 0.00, 0.00, generated_nuban, 'CoreStep Microfinance / Anchor')
    ON CONFLICT (user_id) DO UPDATE SET
        anchor_account_number = COALESCE(wallets.anchor_account_number, generated_nuban),
        anchor_bank_name = COALESCE(wallets.anchor_bank_name, 'CoreStep Microfinance / Anchor');

    -- Update profile
    UPDATE profiles
    SET 
        anchor_account_number = COALESCE(anchor_account_number, generated_nuban),
        anchor_bank_name = COALESCE(anchor_bank_name, 'CoreStep Microfinance / Anchor')
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_on_user_created_anchor_setup ON profiles;
CREATE TRIGGER trigger_on_user_created_anchor_setup
AFTER INSERT ON profiles
FOR EACH ROW EXECUTE FUNCTION on_user_created_anchor_setup();
