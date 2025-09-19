-- Add admin policy for message deletion
CREATE POLICY "Admins can delete any message" ON public.messages 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );