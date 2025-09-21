-- Test the email trigger by creating a notification
-- This should automatically create an email log entry

-- First, get a user ID to test with
SELECT user_id, email, full_name FROM profiles LIMIT 1;

-- Insert a test notification (replace USER_ID with actual user_id from above)
-- INSERT INTO notifications (user_id, title, message, type) 
-- VALUES ('USER_ID_HERE', 'Test Notification', 'This is a test message to verify email automation', 'info');

-- Check if email was logged
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 5;