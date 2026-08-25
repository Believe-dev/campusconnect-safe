-- Step 3: Create trigger (run after step 2)
CREATE OR REPLACE FUNCTION create_payout_notification()
RETURNS TRIGGER AS $$
DECLARE
    notification_title TEXT;
    notification_message TEXT;
BEGIN
    IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
        
        IF NEW.status = 'approved' THEN
            notification_title := 'Payout Request Approved';
            notification_message := format('Your payout request of ₦%s has been approved and funds deducted. You will receive money within 48 hours.', NEW.amount);
        ELSE
            notification_title := 'Payout Request Rejected';
            notification_message := format('Your payout request of ₦%s has been rejected. Contact support for details.', NEW.amount);
        END IF;
        
        INSERT INTO notifications (
            user_id, title, message, type, reference_id, reference_type
        ) VALUES (
            NEW.user_id, notification_title, notification_message, 'payout', NEW.id::TEXT, 'payout_request'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS payout_status_notification_trigger ON payout_requests;
CREATE TRIGGER payout_status_notification_trigger
    AFTER UPDATE ON payout_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_payout_notification();