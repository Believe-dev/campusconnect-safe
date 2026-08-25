-- Activate subscription for ALL sellers
UPDATE profiles 
SET 
    seller_subscription_expires_at = NOW() + INTERVAL '30 days',
    seller_features_active = TRUE,
    seller_subscription_type = 'monthly',
    seller_last_payment_date = NOW(),
    seller_registration_paid = TRUE,
    updated_at = NOW()
WHERE account_type = 'seller';

-- Create subscription records for all sellers
INSERT INTO seller_subscriptions (
    user_id,
    subscription_type,
    amount,
    payment_reference,
    starts_at,
    expires_at,
    status
)
SELECT 
    user_id,
    'monthly',
    1000.00,
    'activation_' || gen_random_uuid()::text,
    NOW(),
    NOW() + INTERVAL '30 days',
    'active'
FROM profiles 
WHERE account_type = 'seller'
AND user_id NOT IN (SELECT user_id FROM seller_subscriptions WHERE user_id IS NOT NULL);