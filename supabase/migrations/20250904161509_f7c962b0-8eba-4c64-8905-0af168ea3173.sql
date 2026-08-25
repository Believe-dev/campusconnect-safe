-- Update the seller's verification status to approved so their products are visible
UPDATE profiles 
SET verification_status = 'approved', 
    verified_at = now(),
    verified_by = user_id  -- Self-approved for now, in real scenario this would be admin user ID
WHERE user_id = '197cc55f-a224-4bcb-9f0c-f4abd3639626';