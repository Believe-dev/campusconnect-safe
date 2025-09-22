-- Create trigger to automatically send dispute notifications
CREATE OR REPLACE FUNCTION notify_seller_on_dispute()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger when status changes to 'disputed'
  IF NEW.status = 'disputed' AND (OLD.status IS NULL OR OLD.status != 'disputed') THEN
    -- Send dispute notification to seller
    PERFORM send_dispute_investigation_notification(
      NEW.id,
      'other', -- Default dispute type, can be enhanced to detect specific types
      NULL     -- Use template message
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_dispute_notification ON orders;
CREATE TRIGGER trigger_dispute_notification
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_seller_on_dispute();

COMMENT ON FUNCTION notify_seller_on_dispute IS 'Automatically sends dispute notification to seller when order status changes to disputed';