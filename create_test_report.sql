-- Create a test product report to verify the admin dashboard functionality
-- Run this in Supabase SQL editor after replacing the UUIDs with actual values from your database

-- First, let's see what products and users exist
SELECT 'Products available:' as info;
SELECT id, title, seller_id FROM products LIMIT 5;

SELECT 'Users available:' as info;
SELECT user_id, full_name, email FROM profiles LIMIT 5;

-- Create a test product report (replace UUIDs with actual values)
-- You'll need to replace these UUIDs with real ones from your database
/*
INSERT INTO product_reports (
    product_id, 
    reported_by, 
    reason, 
    description, 
    status
) VALUES (
    'YOUR_PRODUCT_ID_HERE',  -- Replace with actual product ID
    'YOUR_USER_ID_HERE',     -- Replace with actual user ID
    'misleading_description',
    'This product description does not match the actual item being sold.',
    'pending'
);
*/

-- Check if the report was created
SELECT 
    pr.id,
    pr.reason,
    pr.description,
    pr.status,
    pr.created_at,
    p.title as product_title,
    reporter.full_name as reporter_name
FROM product_reports pr
LEFT JOIN products p ON pr.product_id = p.id
LEFT JOIN profiles reporter ON pr.reported_by = reporter.user_id
ORDER BY pr.created_at DESC
LIMIT 5;