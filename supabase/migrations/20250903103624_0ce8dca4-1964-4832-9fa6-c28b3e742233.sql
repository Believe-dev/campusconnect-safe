-- Add seller verification fields to profiles table
ALTER TABLE public.profiles ADD COLUMN face_photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN student_id_photo_url TEXT;
ALTER TABLE public.profiles ADD COLUMN verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE public.profiles ADD COLUMN admin_notes TEXT;
ALTER TABLE public.profiles ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.profiles ADD COLUMN verified_by UUID REFERENCES auth.users(id);

-- Update RLS policies for profile visibility
DROP POLICY IF EXISTS "Authenticated users can view basic seller info" ON public.profiles;

-- Create new policies for profile visibility
CREATE POLICY "Anyone can view approved seller public info" 
ON public.profiles 
FOR SELECT 
USING (
  verification_status = 'approved' AND 
  account_type IN ('seller', 'both')
);

-- Users can view their own complete profile
CREATE POLICY "Users can view own complete profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Update products policy to only show products from approved sellers
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view products from approved sellers" 
ON public.products 
FOR SELECT 
USING (
  is_active = true AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = products.seller_id 
    AND profiles.verification_status = 'approved'
  )
);

-- Create storage buckets for verification photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('verification-photos', 'verification-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification photos
CREATE POLICY "Users can upload their verification photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'verification-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own verification photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'verification-photos' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all verification photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'verification-photos' AND 
  is_admin(auth.uid())
);