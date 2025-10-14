-- Fix business name and photo handling in signup process
-- Ensure the handle_new_user function properly saves business_name and photo URLs

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    account_type_val TEXT;
    university_val TEXT;
    full_name_val TEXT;
    student_id_val TEXT;
    phone_number_val TEXT;
    business_name_val TEXT;
    avatar_url_val TEXT;
    student_id_photo_url_val TEXT;
    bio_val TEXT;
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
    business_name_val := NEW.raw_user_meta_data->>'business_name';
    avatar_url_val := NEW.raw_user_meta_data->>'avatar_url';
    student_id_photo_url_val := NEW.raw_user_meta_data->>'student_id_photo_url';
    bio_val := NEW.raw_user_meta_data->>'bio';
    
    -- Insert profile with all required columns including business_name and photos
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name, 
        account_type,
        university_name,
        student_id,
        phone_number,
        business_name,
        avatar_url,
        student_id_photo_url,
        bio,
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
        business_name_val,
        avatar_url_val,
        student_id_photo_url_val,
        bio_val,
        CASE 
            WHEN account_type_val = 'seller' THEN 'pending'
            ELSE NULL
        END,
        CASE 
            WHEN account_type_val = 'seller' THEN FALSE
            ELSE NULL
        END,
        CASE 
            WHEN account_type_val = 'seller' THEN FALSE
            ELSE NULL
        END
    );
    
    -- Create wallet for the user
    BEGIN
        INSERT INTO wallets (user_id, available_balance, pending_balance, total_earnings, total_commission_paid)
        VALUES (NEW.id, 0.00, 0.00, 0.00, 0.00)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log warning but don't fail user creation
            RAISE WARNING 'Failed to create wallet for user %: %', NEW.id, SQLERRM;
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