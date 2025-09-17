-- Fix user creation and profile photo issues

-- 1. Make wallet creation trigger more robust
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create wallet if it doesn't exist
    INSERT INTO wallets (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the profile creation
        RAISE WARNING 'Failed to create wallet for user %: %', NEW.user_id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a function to handle profile creation with proper error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile entry
    INSERT INTO profiles (
        user_id,
        email,
        full_name,
        university_name,
        campus,
        account_type,
        seller_status
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'university_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'campus', ''),
        COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer'),
        CASE 
            WHEN COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer') = 'seller' THEN 'pending'
            ELSE NULL
        END
    ) ON CONFLICT (user_id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        university_name = COALESCE(EXCLUDED.university_name, profiles.university_name),
        campus = COALESCE(EXCLUDED.campus, profiles.campus),
        account_type = COALESCE(EXCLUDED.account_type, profiles.account_type),
        seller_status = COALESCE(EXCLUDED.seller_status, profiles.seller_status);

    -- Add user role
    INSERT INTO user_roles (user_id, role)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer')
    ) ON CONFLICT (user_id, role) DO NOTHING;

    -- Create wallet
    INSERT INTO wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user for %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 4. Fix storage permissions for profile photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-photos', 'verification-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 5. Create storage policies for verification photos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can upload their own verification photos'
    ) THEN
        CREATE POLICY "Users can upload their own verification photos" ON storage.objects
            FOR INSERT WITH CHECK (
                bucket_id = 'verification-photos' AND
                auth.uid()::text = (storage.foldername(name))[1]
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Users can view their own verification photos'
    ) THEN
        CREATE POLICY "Users can view their own verification photos" ON storage.objects
            FOR SELECT USING (
                bucket_id = 'verification-photos' AND
                auth.uid()::text = (storage.foldername(name))[1]
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname = 'Admins can view all verification photos'
    ) THEN
        CREATE POLICY "Admins can view all verification photos" ON storage.objects
            FOR SELECT USING (
                bucket_id = 'verification-photos' AND
                EXISTS (
                    SELECT 1 FROM user_roles 
                    WHERE user_id = auth.uid() AND role = 'admin'
                )
            );
    END IF;
END $$;

-- 6. Make verification photos bucket public for easier access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'verification-photos';