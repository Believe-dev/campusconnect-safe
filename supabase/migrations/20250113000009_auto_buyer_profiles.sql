-- Update profile creation to handle all signup data properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    account_type_val TEXT;
    university_val TEXT;
    full_name_val TEXT;
    student_id_val TEXT;
    phone_number_val TEXT;
BEGIN
    -- Extract all metadata from signup
    account_type_val := COALESCE(NEW.raw_user_meta_data->>'account_type', 'buyer');
    university_val := NEW.raw_user_meta_data->>'university_name';
    full_name_val := NEW.raw_user_meta_data->>'full_name';
    student_id_val := NEW.raw_user_meta_data->>'student_id';
    phone_number_val := NEW.raw_user_meta_data->>'phone_number';
    
    -- Insert complete profile with all signup data
    INSERT INTO public.profiles (
        user_id, 
        email, 
        full_name, 
        account_type,
        university_name,
        student_id,
        phone_number,
        department,
        business_name,
        seller_status
    )
    VALUES (
        NEW.id, 
        COALESCE(NEW.email, ''),
        COALESCE(full_name_val, COALESCE(NEW.email, 'User')),
        account_type_val,
        university_val,
        student_id_val,
        phone_number_val,
        NEW.raw_user_meta_data->>'department',
        NEW.raw_user_meta_data->>'business_name',
        CASE 
            WHEN account_type_val = 'seller' THEN 'pending'
            ELSE NULL  -- Buyers don't need seller approval
        END
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the seller notification function to only notify for sellers
CREATE OR REPLACE FUNCTION notify_seller_approval_timeline()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify for seller registrations, not buyers
    IF NEW.account_type = 'seller' AND NEW.seller_status = 'pending' THEN
        -- Insert seller timeline notification
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (
            NEW.user_id,
            'Seller Application Submitted ⏳',
            'Your seller application has been submitted successfully! Our admin team will review your application within 3 working days. You''ll receive a notification once approved.',
            'info'
        );
        
        -- Notify admins about new seller application
        INSERT INTO notifications (user_id, title, message, type)
        SELECT 
            p.user_id,
            'New Seller Application 📝',
            'A new seller has registered and needs approval. Check the admin panel to review their application.',
            'info'
        FROM profiles p
        JOIN user_roles ur ON p.user_id = ur.user_id
        WHERE ur.role = 'admin';
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail profile creation if notifications fail
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;