-- Setup RLS policies for disputes and verification requests
-- Run this AFTER running simple_dispute_migration.sql

-- Disputes policies
CREATE POLICY "dispute_select_policy" ON public.disputes
  FOR SELECT USING (
    reported_by = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "dispute_insert_policy" ON public.disputes
  FOR INSERT WITH CHECK (
    reported_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM orders o 
      WHERE o.id = order_id AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
  );

CREATE POLICY "dispute_update_policy" ON public.disputes
  FOR UPDATE USING (
    reported_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Verification requests policies
CREATE POLICY "verification_select_policy" ON public.verification_requests
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "verification_insert_policy" ON public.verification_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "verification_update_policy" ON public.verification_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );