-- Fix message count for completed orders and enhance dispute notifications

-- 1. Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can manage dispute templates" ON public.dispute_notification_templates;

-- 2. Create trigger to automatically send dispute notifications
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

-- 2. Update dispute notification function to include detailed in-app notification
CREATE OR REPLACE FUNCTION send_dispute_investigation_notification(
  p_order_id UUID,
  p_dispute_type TEXT,
  p_custom_message TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order RECORD;
  v_template RECORD;
  v_final_message TEXT;
  v_final_subject TEXT;
BEGIN
  -- Get order details
  SELECT 
    o.*,
    p.title as product_title,
    seller.full_name as seller_name,
    seller.email as seller_email,
    buyer.full_name as buyer_name
  INTO v_order
  FROM orders o
  JOIN products p ON o.product_id = p.id
  JOIN profiles seller ON o.seller_id = seller.user_id
  JOIN profiles buyer ON o.buyer_id = buyer.user_id
  WHERE o.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Get template for dispute type
  SELECT * INTO v_template
  FROM dispute_notification_templates
  WHERE dispute_type = p_dispute_type
  LIMIT 1;

  IF NOT FOUND THEN
    -- Use default template
    SELECT * INTO v_template
    FROM dispute_notification_templates
    WHERE dispute_type = 'other'
    LIMIT 1;
  END IF;

  -- Use custom message if provided, otherwise use template
  IF p_custom_message IS NOT NULL THEN
    v_final_message := p_custom_message;
    v_final_subject := 'Dispute Investigation: ' || v_order.product_title;
  ELSE
    v_final_message := v_template.message;
    v_final_subject := v_template.subject;
  END IF;

  -- Replace placeholders in message and subject
  v_final_message := REPLACE(v_final_message, '{seller_name}', v_order.seller_name);
  v_final_message := REPLACE(v_final_message, '{product_title}', v_order.product_title);
  v_final_message := REPLACE(v_final_message, '{order_id}', v_order.id::TEXT);
  v_final_message := REPLACE(v_final_message, '{buyer_name}', v_order.buyer_name);
  v_final_message := REPLACE(v_final_message, '{order_date}', v_order.created_at::DATE::TEXT);

  v_final_subject := REPLACE(v_final_subject, '{seller_name}', v_order.seller_name);
  v_final_subject := REPLACE(v_final_subject, '{product_title}', v_order.product_title);
  v_final_subject := REPLACE(v_final_subject, '{order_id}', v_order.id::TEXT);
  v_final_subject := REPLACE(v_final_subject, '{buyer_name}', v_order.buyer_name);
  v_final_subject := REPLACE(v_final_subject, '{order_date}', v_order.created_at::DATE::TEXT);

  -- Send email notification
  INSERT INTO email_logs (
    recipient_email,
    subject,
    html_content,
    text_content,
    status,
    sent_at,
    from_email,
    from_name
  ) VALUES (
    v_order.seller_email,
    v_final_subject,
    '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;"><h2>Dispute Investigation</h2><pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">' || v_final_message || '</pre></div>',
    v_final_message,
    'delivered',
    NOW(),
    'noreply@campusconnect.com',
    'CampusConnect Investigation Team'
  );

  -- Create detailed in-app notification for seller
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    v_order.seller_id,
    '🚨 Dispute Filed - Action Required',
    'Order Dispute Details:
• Product: ' || v_order.product_title || '
• Order ID: ' || v_order.id::TEXT || '
• Buyer: ' || v_order.buyer_name || '
• Amount: ₦' || v_order.total_amount::TEXT || '
• Date: ' || v_order.created_at::DATE::TEXT || '

Please check your email for full details and required actions. You have 48 hours to respond.',
    'error'
  );

  -- Update order status to disputed if not already
  UPDATE orders 
  SET status = 'disputed'
  WHERE id = p_order_id AND status != 'disputed';

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to send dispute notification: %', SQLERRM;
END;
$$;

-- 3. Recreate the policy
CREATE POLICY "Admins can manage dispute templates" ON public.dispute_notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add comments
COMMENT ON FUNCTION notify_seller_on_dispute IS 'Automatically sends dispute notification to seller when order status changes to disputed';
COMMENT ON FUNCTION send_dispute_investigation_notification IS 'Sends detailed investigation notification to seller when dispute is filed';