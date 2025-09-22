-- Create dispute notification templates table
CREATE TABLE IF NOT EXISTS public.dispute_notification_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dispute_type TEXT NOT NULL,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default templates for different dispute types
INSERT INTO public.dispute_notification_templates (dispute_type, template_name, subject, message) VALUES
('item_not_received', 'Item Not Received Investigation', 'Investigation Started: Item Not Received Dispute', 'Hello {seller_name},

We have received a dispute from a buyer regarding an order that was not received. We are now investigating this matter.

Order Details:
- Product: {product_title}
- Order ID: {order_id}
- Buyer: {buyer_name}
- Order Date: {order_date}

Please provide the following information within 48 hours:
1. Proof of shipment (tracking number, receipt, etc.)
2. Shipping method used
3. Any communication with the buyer regarding delivery

If you cannot provide proof of shipment, we may need to process a refund for the buyer.

Please respond to this email with the requested information.

Best regards,
CampusConnect Investigation Team'),

('item_damaged', 'Item Damaged Investigation', 'Investigation Started: Damaged Item Dispute', 'Hello {seller_name},

We have received a dispute from a buyer regarding a damaged item. We are now investigating this matter.

Order Details:
- Product: {product_title}
- Order ID: {order_id}
- Buyer: {buyer_name}
- Order Date: {order_date}

The buyer has reported that the item arrived damaged. Please review your packaging and shipping procedures.

We may need to process a partial or full refund depending on the extent of the damage. Please respond within 48 hours if you have any additional information about this order.

Best regards,
CampusConnect Investigation Team'),

('wrong_item', 'Wrong Item Investigation', 'Investigation Started: Wrong Item Dispute', 'Hello {seller_name},

We have received a dispute from a buyer who received the wrong item. We are now investigating this matter.

Order Details:
- Product: {product_title}
- Order ID: {order_id}
- Buyer: {buyer_name}
- Order Date: {order_date}

Please verify that you sent the correct item as described in the listing. If an error occurred, please arrange for the correct item to be sent or process a refund.

Please respond within 48 hours with your plan to resolve this issue.

Best regards,
CampusConnect Investigation Team'),

('not_as_described', 'Item Not As Described Investigation', 'Investigation Started: Item Not As Described', 'Hello {seller_name},

We have received a dispute from a buyer stating that the item received does not match the description in your listing.

Order Details:
- Product: {product_title}
- Order ID: {order_id}
- Buyer: {buyer_name}
- Order Date: {order_date}

Please review your product listing to ensure accuracy. If there was a misunderstanding, please work with the buyer to find a resolution.

We may need to process a refund if the item significantly differs from the description.

Please respond within 48 hours with your response to this dispute.

Best regards,
CampusConnect Investigation Team'),

('other', 'General Dispute Investigation', 'Investigation Started: Order Dispute', 'Hello {seller_name},

We have received a dispute from a buyer regarding their order. We are now investigating this matter.

Order Details:
- Product: {product_title}
- Order ID: {order_id}
- Buyer: {buyer_name}
- Order Date: {order_date}

Please review the order details and contact the buyer to resolve any issues. We encourage both parties to communicate and find a mutually acceptable solution.

If you cannot reach a resolution, please respond to this email with your side of the situation within 48 hours.

Best regards,
CampusConnect Investigation Team');

-- Create function to send dispute investigation notification
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

  -- Update order status to under_investigation if not already disputed
  UPDATE orders 
  SET status = 'disputed'
  WHERE id = p_order_id AND status != 'disputed';

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to send dispute notification: %', SQLERRM;
END;
$$;

-- Enable RLS on dispute_notification_templates
ALTER TABLE public.dispute_notification_templates ENABLE ROW LEVEL SECURITY;

-- Create policy for admins to manage templates
CREATE POLICY "Admins can manage dispute templates" ON public.dispute_notification_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Grant permissions
GRANT ALL ON public.dispute_notification_templates TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

COMMENT ON TABLE public.dispute_notification_templates IS 'Templates for dispute investigation notifications';
COMMENT ON FUNCTION send_dispute_investigation_notification IS 'Sends investigation notification to seller when dispute is filed';