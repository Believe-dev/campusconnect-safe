-- Fix ON CONFLICT error by ensuring proper unique constraints exist
-- This addresses the error: "there is no unique or exclusion constraint matching the ON CONFLICT specification"

-- First, let's check and fix the wallets table constraint
DO $$
BEGIN
    -- Ensure wallets table has the proper unique constraint on user_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'wallets_user_id_key' 
        AND conrelid = 'wallets'::regclass
    ) THEN
        -- Add unique constraint if it doesn't exist
        ALTER TABLE wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
    END IF;
END $$;

-- Fix the handle_new_user function to handle ON CONFLICT properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    account_type_val TEXT;
    university_val TEXT;
    full_name_val TEXT;
    student_id_val TEXT;
    phone_number_val TEXT;
    profile_exists BOOLEAN := FALSE;
BEGIN
    -- Check if profile already exists to prevent duplicates
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE user_id = NEW.id) INTO profile_exists;
    
    IF profile_exists THEN
        RETURN NEW;
    END IF;
    
    -- Extract metadata with safe defaults
    account_type_val := COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer');
    university_val := NEW.raw_user_meta_data->>'university_name';
    full_name_val := COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(COALESCE(NEW.email, 'User'), '@', 1));
    student_id_val := NEW.raw_user_meta_data->>'student_id';
    phone_number_val := NEW.raw_user_meta_data->>'phone_number';
    
    -- Insert profile with all required columns
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name, 
        account_type,
        university_name,
        student_id,
        phone_number,
        seller_status,
        seller_registration_paid,
        seller_features_active
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        full_name_val,
        account_type_val,
        university_val,
        student_id_val,
        phone_number_val,
        CASE 
            WHEN account_type_val = 'seller' THEN 'pending'
            ELSE NULL
        END,
        FALSE,
        FALSE
    );
    
    -- Create wallet for the user (only if wallets table exists and has unique constraint)
    BEGIN
        -- Check if wallet already exists first
        IF NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = NEW.id) THEN
            INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
            VALUES (NEW.id, 0.00, 0.00, 0.00, 0.00);
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log warning but don't fail user creation
            RAISE WARNING 'Failed to create wallet for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Assign user role (only if user_roles table exists and has unique constraint)
    BEGIN
        -- Check if role already exists first
        IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.id AND role = account_type_val::app_role) THEN
            INSERT INTO user_roles (user_id, role)
            VALUES (NEW.id, account_type_val::app_role);
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log warning but don't fail user creation
            RAISE WARNING 'Failed to assign role for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Send welcome notification for buyers, seller approval notification for sellers
    BEGIN
        IF account_type_val = 'seller' THEN
            -- Notify seller about approval process
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                NEW.id,
                'Seller Application Submitted ⏳',
                'Your seller application has been submitted successfully! Our admin team will review your application within 3 working days. You''ll receive a notification once approved.',
                'info'
            );
            
            -- Notify admins about new seller application
            INSERT INTO notifications (user_id, title, message, type)
            SELECT 
                ur.user_id,
                'New Seller Application 📝',
                'A new seller has registered and needs approval. Check the admin panel to review their application.',
                'info'
            FROM user_roles ur
            WHERE ur.role = 'admin';
        ELSE
            -- Welcome notification for buyers
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                NEW.id,
                'Welcome to UniMarket! 🎉',
                'Your account has been created successfully. Start exploring products from verified student sellers.',
                'info'
            );
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- Don't fail profile creation if notifications fail
            RAISE WARNING 'Failed to send notifications for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the create_user_wallet function to avoid ON CONFLICT issues
CREATE OR REPLACE FUNCTION create_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if wallet already exists before inserting
    IF NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = NEW.user_id) THEN
        INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
        VALUES (NEW.user_id, 0.00, 0.00, 0.00, 0.00);
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log warning but don't fail
        RAISE WARNING 'Failed to create wallet for user %: %', NEW.user_id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the assign_seller_role function
CREATE OR REPLACE FUNCTION assign_seller_role(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow users to assign seller role to themselves
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Cannot assign role to another user';
    END IF;
    
    -- Check if seller role already exists before inserting
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user_id AND role = 'seller') THEN
        INSERT INTO user_roles (user_id, role)
        VALUES (p_user_id, 'seller');
    END IF;
    
    -- Update profile account_type
    UPDATE profiles 
    SET account_type = CASE 
        WHEN account_type = 'buyer' THEN 'seller'
        WHEN account_type = 'seller' THEN 'seller'
        ELSE 'both'
    END,
    seller_status = 'pending'
    WHERE user_id = p_user_id;
END;
$$;

-- Fix the upgrade_to_seller function
CREATE OR REPLACE FUNCTION upgrade_to_seller()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if seller role already exists before inserting
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = current_user_id AND role = 'seller') THEN
        INSERT INTO user_roles (user_id, role)
        VALUES (current_user_id, 'seller');
    END IF;
    
    -- Update profile account_type and seller_status
    UPDATE profiles 
    SET account_type = CASE 
        WHEN account_type = 'buyer' THEN 'seller'
        ELSE 'both'
    END,
    seller_status = 'pending'
    WHERE user_id = current_user_id;
END;
$$;

-- Fix the create_user_game_stats function if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_user_game_stats') THEN
        EXECUTE '
        CREATE OR REPLACE FUNCTION create_user_game_stats()
        RETURNS TRIGGER AS $func$
        BEGIN
            -- Check if game stats already exist before inserting
            IF NOT EXISTS (SELECT 1 FROM game_stats WHERE user_id = NEW.user_id) THEN
                INSERT INTO game_stats (user_id, total_unicoins, games_played, total_score)
                VALUES (NEW.user_id, 0, 0, 0);
            END IF;
            RETURN NEW;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log warning but don''t fail
                RAISE WARNING ''Failed to create game stats for user %: %'', NEW.user_id, SQLERRM;
                RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER;
        ';
    END IF;
END $$;

-- Ensure all existing users have wallets (safety check)
DO $$
BEGIN
    INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
    SELECT p.user_id, 0.00, 0.00, 0.00, 0.00
    FROM profiles p
    LEFT JOIN wallets w ON p.user_id = w.user_id
    WHERE w.user_id IS NULL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create missing wallets: %', SQLERRM;
END $$;

-- Ensure all existing users have roles (safety check)
DO $$
BEGIN
    INSERT INTO user_roles (user_id, role)
    SELECT p.user_id, p.account_type::app_role
    FROM profiles p
    LEFT JOIN user_roles ur ON p.user_id = ur.user_id AND ur.role = p.account_type::app_role
    WHERE ur.user_id IS NULL
    AND p.account_type IN ('buyer', 'seller', 'admin');
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create missing user roles: %', SQLERRM;
END $$;

-- Add comment to track this fix
COMMENT ON FUNCTION handle_new_user IS 'Fixed ON CONFLICT error by using EXISTS checks instead of ON CONFLICT clauses';