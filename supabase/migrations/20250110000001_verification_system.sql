-- Create verification requests table
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  documents TEXT[], -- Array of document URLs
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own requests" ON public.verification_requests 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create requests" ON public.verification_requests 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests" ON public.verification_requests 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND account_type = 'admin'
    )
  );

CREATE POLICY "Admins can update requests" ON public.verification_requests 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND account_type = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX idx_verification_requests_status ON public.verification_requests(status);