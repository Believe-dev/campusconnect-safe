-- Test script to verify product reports functionality
-- Run this in Supabase SQL editor to test the product reports system

-- 1. Check if product_reports table exists and has correct structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'product_reports' 
ORDER BY ordinal_position;

-- 2. Check if there are any existing product reports
SELECT 
    pr.*,
    p.title as product_title,
    reporter.full_name as reporter_name,
    seller.full_name as seller_name
FROM product_reports pr
LEFT JOIN products p ON pr.product_id = p.id
LEFT JOIN profiles reporter ON pr.reported_by = reporter.user_id
LEFT JOIN profiles seller ON p.seller_id = seller.user_id
ORDER BY pr.created_at DESC
LIMIT 10;

-- 3. Check RLS policies for product_reports
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'product_reports';

-- 4. Test query that admin dashboard uses
SELECT 
    pr.*,
    p.title,
    p.seller_id,
    reporter.full_name as reporter_full_name,
    reporter.email as reporter_email
FROM product_reports pr
LEFT JOIN products p ON pr.product_id = p.id
LEFT JOIN profiles reporter ON pr.reported_by = reporter.user_id
ORDER BY pr.created_at DESC;