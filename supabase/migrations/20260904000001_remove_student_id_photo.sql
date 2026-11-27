-- Removes the ID-card-photo upload/review requirement for sellers. This was
-- a self-uploaded photo an admin reviewed by eye - a materially weaker check
-- than the BVN/NIN identity verification (via Anchor) sellers already have
-- to complete before withdrawing funds, and duplicated it without adding any
-- real trust signal. BVN/NIN verification is untouched by this migration and
-- remains the actual seller identity check.
--
-- send_seller_reminders() (20250113000002_seller_reminder_system.sql) is
-- rewritten here to drop its student_id_photo_url check - it was never wired
-- up via pg_cron.schedule (dead/unused function), but its embedded SQL would
-- start failing at next invocation once the column below is gone if left
-- as-is.

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
    -- Find sellers without a profile picture
    FOR seller_record IN
        SELECT user_id, full_name, created_at
        FROM profiles
        WHERE account_type IN ('seller', 'both')
        AND avatar_url IS NULL
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
                reminder_message := 'Upload your profile picture to start selling on UniMarket.';
            WHEN 2 THEN
                reminder_title := 'Profile Still Incomplete';
                reminder_message := 'Your seller profile is missing a profile picture. Upload one now to get approved.';
            WHEN 3 THEN
                reminder_title := 'Final Reminder - Upload Profile Picture';
                reminder_message := 'This is your final reminder. Upload your profile picture within 24 hours.';
            WHEN 4 THEN
                reminder_title := 'Action Required - Account at Risk';
                reminder_message := 'Your seller features may be restricted if you don''t upload a profile picture today. This is to maintain platform security.';
            ELSE
                CONTINUE; -- Skip other days
        END CASE;

        -- Insert notification
        INSERT INTO notifications (user_id, title, message, type)
        VALUES (seller_record.user_id, reminder_title, reminder_message, 'seller_reminder');

    END LOOP;
END;
$$;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS student_id_photo_url;
