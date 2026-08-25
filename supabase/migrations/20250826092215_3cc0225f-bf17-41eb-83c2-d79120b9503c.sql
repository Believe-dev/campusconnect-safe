-- Update existing user to be a seller for demo purposes
UPDATE public.profiles 
SET account_type = 'both',
    full_name = 'Demo Seller',
    bio = 'Experienced seller with quality products for students. Fast delivery and excellent customer service.',
    rating = 4.8,
    total_reviews = 47,
    is_verified = true
WHERE user_id = '197cc55f-a224-4bcb-9f0c-f4abd3639626';