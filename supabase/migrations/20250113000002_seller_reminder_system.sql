-- Create function to send daily reminders to incomplete sellers
CREATE OR REPLACE FUNCTION send_seller_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    seller_record RECORD;
    days_since_signup INTEGER;
    reminder_message TEXT;
    reminder_title TEXT;
BEGIN
    -- Find sellers without profile picture or student ID
    FOR seller_record IN 
        SELECT user_id, full_name, created_at
        FROM profiles 
        WHERE account_type IN ('seller', 'both')
        AND (avatar_url IS NULL OR student_id_photo_url IS NULL)
        AND created_at >= NOW() - INTERVAL '7 days' -- Only remind for 7 days
    LOOP
        -- Calculate days since signup
        days_since_signup := EXTRACT(DAY FROM NOW() - seller_record.created_at);
        
        -- Skip if already sent reminder today
        IF EXISTS (
            SELECT 1 FROM notifications 
            WHERE user_id = seller_record.user_id 
            AND type = 'seller_reminder'
            AND created_at >= CURRENT_DATE
        ) THEN
            CONTINUE;
        END IF;
        
        -- Set message based on days
        CASE days_since_signup
            WHEN 1 THEN
                reminder_title := 'Complete Your Seller Profile';
                reminder_message := 'Upload your profile picture and student ID card to start selling on UniMarket.';
            WHEN 2 THEN
                reminder_title := 'Profile Still Incomplete';
                reminder_message := 'Your seller profile is missing required documents. Upload them now to get approved.';
            WHEN 3 THEN
                reminder_title := 'Final Reminder - Upload Documents';
                reminder_message := 'This is your final reminder. Upload your profile picture and student ID card within 24 hours.';
            WHEN 4 THEN
                reminder_title := 'Action Required - Account at Risk';
                reminder_message := 'Your seller features may be restricted if you don''t upload required documents today. This is to maintain platform security.';
            ELSE
                CONTINUE; -- Skip other days
        END CASE;
        
        -- Insert notification
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (seller_record.user_id, reminder_title, reminder_message, 'seller_reminder');
        
    END LOOP;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION send_seller_reminders() TO authenticated;

-- Create a trigger to run this daily (requires pg_cron extension)
-- This would typically be set up as a cron job or scheduled task