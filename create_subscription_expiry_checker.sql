-- Create function to automatically disable expired seller subscriptions
-- This function should be called daily via cron job or edge function

CREATE OR REPLACE FUNCTION check_expired_seller_subscriptions()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER := 0;
    current_date_midnight TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current date at midnight for precise daily checks
    current_date_midnight := DATE_TRUNC('day', NOW());
    
    -- Update profiles where subscription has expired (expires_at < current midnight)
    UPDATE profiles 
    SET 
        seller_features_active = FALSE,
        updated_at = NOW()
    WHERE 
        (account_type = 'seller' OR account_type = 'both')
        AND seller_features_active = TRUE
        AND seller_subscription_expires_at IS NOT NULL
        AND seller_subscription_expires_at < current_date_midnight;
    
    -- Get count of updated rows
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Create notifications for accounts that expired today
    INSERT INTO notifications (user_id, title, message, type, created_at)
    SELECT 
        user_id,
        'Subscription Expired',
        'Your seller subscription has expired. Please renew to continue accessing seller features.',
        'subscription_expired',
        NOW()
    FROM profiles 
    WHERE 
        (account_type = 'seller' OR account_type = 'both')
        AND seller_features_active = FALSE
        AND seller_subscription_expires_at IS NOT NULL
        AND seller_subscription_expires_at < current_date_midnight
        AND seller_subscription_expires_at >= current_date_midnight - INTERVAL '1 day'
        AND NOT EXISTS (
            SELECT 1 FROM notifications 
            WHERE notifications.user_id = profiles.user_id 
            AND notifications.type = 'subscription_expired'
            AND notifications.created_at >= current_date_midnight - INTERVAL '1 day'
        );
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_expired_seller_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION check_expired_seller_subscriptions() TO service_role;