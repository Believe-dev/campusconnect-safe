-- Test script to check and create sample seller applications

-- Check if seller_applications table exists and has data
SELECT 'Checking seller_applications table...' as status;
SELECT COUNT(*) as total_applications FROM seller_applications;
SELECT COUNT(*) as pending_applications FROM seller_applications WHERE status = 'pending';

-- Check profiles table for buyers who could apply
SELECT 'Checking potential applicants...' as status;
SELECT COUNT(*) as total_buyers FROM profiles WHERE account_type = 'buyer';

-- Create a sample seller application if none exist (for testing)
DO $$
DECLARE
    sample_user_id UUID;
    application_count INTEGER;
BEGIN
    -- Check if there are any pending applications
    SELECT COUNT(*) INTO application_count FROM seller_applications WHERE status = 'pending';
    
    IF application_count = 0 THEN
        -- Find a buyer to create a sample application
        SELECT user_id INTO sample_user_id 
        FROM profiles 
        WHERE account_type = 'buyer' 
        AND user_id NOT IN (SELECT user_id FROM seller_applications)
        LIMIT 1;
        
        IF sample_user_id IS NOT NULL THEN
            INSERT INTO seller_applications (
                user_id,
                reason,
                status,
                created_at
            ) VALUES (
                sample_user_id,
                'I would like to become a seller to offer my handmade crafts and textbooks to fellow students. I have experience selling online and believe I can provide quality products at fair prices.',
                'pending',
                NOW()
            );
            
            RAISE NOTICE 'Created sample seller application for user: %', sample_user_id;
        ELSE
            RAISE NOTICE 'No eligible buyers found to create sample application';
        END IF;
    ELSE
        RAISE NOTICE 'Found % pending applications', application_count;
    END IF;
END $$;

-- Show current pending applications with user details
SELECT 
    sa.id,
    sa.user_id,
    p.full_name,
    p.email,
    p.university_name,
    sa.reason,
    sa.status,
    sa.created_at
FROM seller_applications sa
JOIN profiles p ON sa.user_id = p.user_id
WHERE sa.status = 'pending'
ORDER BY sa.created_at DESC;

-- Show subscription system status
SELECT 'Checking subscription system...' as status;
SELECT COUNT(*) as total_subscriptions FROM seller_subscriptions;
SELECT COUNT(*) as active_subscriptions FROM seller_subscriptions WHERE status = 'active';

-- Show sellers with active subscriptions
SELECT 
    p.full_name,
    p.email,
    p.seller_features_active,
    p.seller_subscription_expires_at,
    CASE 
        WHEN p.seller_subscription_expires_at IS NULL THEN 'No Subscription'
        WHEN p.seller_subscription_expires_at <= NOW() THEN 'Expired'
        WHEN p.seller_subscription_expires_at <= NOW() + INTERVAL '7 days' THEN 'Expiring Soon'
        ELSE 'Active'
    END as subscription_status
FROM profiles p
WHERE p.account_type IN ('seller', 'both')
ORDER BY p.seller_subscription_expires_at DESC NULLS LAST;