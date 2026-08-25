-- Create a demo profile for the seller
INSERT INTO public.profiles (
  id,
  user_id,
  email,
  full_name,
  university_name,
  campus,
  account_type,
  is_verified,
  rating,
  total_reviews,
  bio
) VALUES (
  gen_random_uuid(),
  '00000000-1111-2222-3333-444444444444',
  'demo.seller@unilag.edu.ng',
  'Demo Seller',
  'University of Lagos',
  'University of Lagos',
  'seller',
  true,
  4.8,
  47,
  'Experienced seller with quality products for students. Fast delivery and excellent customer service.'
);