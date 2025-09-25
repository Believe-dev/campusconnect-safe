-- Create disputes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'withdrawn')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES profiles(user_id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create verification_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  documents TEXT[], -- Array of document URLs
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  processed_by UUID REFERENCES profiles(user_id),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for disputes
CREATE POLICY "Users can view their own disputes" ON public.disputes
  FOR SELECT USING (
    reported_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can create disputes for their orders" ON public.disputes
  FOR INSERT WITH CHECK (
    reported_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "Users can withdraw their own disputes" ON public.disputes
  FOR UPDATE USING (reported_by = auth.uid())
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Admins can manage all disputes" ON public.disputes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create policies for verification requests
CREATE POLICY "Users can view their own verification requests" ON public.verification_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create their own verification requests" ON public.verification_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all verification requests" ON public.verification_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Function to withdraw a dispute
CREATE OR REPLACE FUNCTION withdraw_dispute(p_dispute_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dispute RECORD;
  v_order RECORD;
BEGIN
  -- Get dispute details
  SELECT * INTO v_dispute
  FROM disputes
  WHERE id = p_dispute_id AND reported_by = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found or you do not have permission to withdraw it';
  END IF;

  -- Check if dispute can be withdrawn (only open or investigating disputes)
  IF v_dispute.status NOT IN ('open', 'investigating') THEN
    RAISE EXCEPTION 'Cannot withdraw a dispute that has been resolved';
  END IF;

  -- Get order details
  SELECT o.*, p.title as product_title, seller.full_name as seller_name
  INTO v_order
  FROM orders o
  JOIN products p ON o.product_id = p.id
  JOIN profiles seller ON o.seller_id = seller.user_id
  WHERE o.id = v_dispute.order_id;

  -- Update dispute status to withdrawn
  UPDATE disputes
  SET 
    status = 'withdrawn',
    updated_at = NOW()
  WHERE id = p_dispute_id;

  -- Update order status back to confirmed if it was disputed
  UPDATE orders
  SET status = 'confirmed'
  WHERE id = v_dispute.order_id AND status = 'disputed';

  -- Notify seller that dispute was withdrawn
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type
  ) VALUES (
    v_order.seller_id,
    'Dispute Withdrawn ✅',
    'The dispute for "' || v_order.product_title || '" has been withdrawn by the buyer. Your order is now back to confirmed status.',
    'success'
  );

  -- Notify admins about the withdrawal
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type
  )
  SELECT 
    ur.user_id,
    'Dispute Withdrawn',
    'A dispute for "' || v_order.product_title || '" has been withdrawn by the buyer.',
    'info'
  FROM user_roles ur
  WHERE ur.role = 'admin';

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to withdraw dispute: %', SQLERRM;
END;
$$;

-- Function to resolve a dispute (admin only)
CREATE OR REPLACE FUNCTION resolve_dispute(
  p_dispute_id UUID,
  p_admin_notes TEXT DEFAULT NULL,
  p_refund_buyer BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dispute RECORD;
  v_order RECORD;
  v_admin_id UUID;
BEGIN
  -- Check if user is admin
  SELECT user_id INTO v_admin_id
  FROM user_roles
  WHERE user_id = auth.uid() AND role = 'admin'
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Only admins can resolve disputes';
  END IF;

  -- Get dispute details
  SELECT * INTO v_dispute
  FROM disputes
  WHERE id = p_dispute_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Dispute not found';
  END IF;

  -- Get order details
  SELECT o.*, p.title as product_title, 
         seller.full_name as seller_name, buyer.full_name as buyer_name
  INTO v_order
  FROM orders o
  JOIN products p ON o.product_id = p.id
  JOIN profiles seller ON o.seller_id = seller.user_id
  JOIN profiles buyer ON o.buyer_id = buyer.user_id
  WHERE o.id = v_dispute.order_id;

  -- Update dispute status to resolved
  UPDATE disputes
  SET 
    status = 'resolved',
    admin_notes = p_admin_notes,
    resolved_by = v_admin_id,
    resolved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_dispute_id;

  -- Update order status
  UPDATE orders
  SET status = CASE 
    WHEN p_refund_buyer THEN 'refunded'
    ELSE 'confirmed'
  END
  WHERE id = v_dispute.order_id;

  -- Notify both parties
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type
  ) VALUES 
  (
    v_order.buyer_id,
    'Dispute Resolved 🏆',
    'Your dispute for "' || v_order.product_title || '" has been resolved by admin.' || 
    CASE WHEN p_admin_notes IS NOT NULL THEN ' Admin notes: ' || p_admin_notes ELSE '' END,
    'success'
  ),
  (
    v_order.seller_id,
    'Dispute Resolved 🏆',
    'The dispute for "' || v_order.product_title || '" has been resolved by admin.' || 
    CASE WHEN p_admin_notes IS NOT NULL THEN ' Admin notes: ' || p_admin_notes ELSE '' END,
    'info'
  );

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to resolve dispute: %', SQLERRM;
END;
$$;

-- Grant permissions
GRANT ALL ON public.disputes TO authenticated;
GRANT ALL ON public.verification_requests TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_disputes_order_id ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_reported_by ON public.disputes(reported_by);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);

-- Comments
COMMENT ON TABLE public.disputes IS 'Order disputes filed by users';
COMMENT ON TABLE public.verification_requests IS 'User verification badge requests';
COMMENT ON FUNCTION withdraw_dispute IS 'Allows users to withdraw their own disputes';
COMMENT ON FUNCTION resolve_dispute IS 'Allows admins to resolve disputes with optional refund';