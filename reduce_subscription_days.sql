-- Remove 1 day from all existing active seller subscriptions
UPDATE profiles 
SET 
    seller_subscription_expires_at = seller_subscription_expires_at - INTERVAL '1 day',
    updated_at = NOW()
WHERE 
    (account_type = 'seller' OR account_type = 'both')
    AND seller_features_active = TRUE
    AND seller_subscription_expires_at IS NOT NULL
    AND seller_subscription_expires_at > NOW();

-- Show updated subscriptions
SELECT 
    full_name,
    email,
    seller_subscription_expires_at,
    EXTRACT(DAY FROM (seller_subscription_expires_at - NOW())) as days_remaining
FROM profiles 
WHERE 
    (account_type = 'seller' OR account_type = 'both')
    AND seller_subscription_expires_at IS NOT NULL
ORDER BY seller_subscription_expires_at;