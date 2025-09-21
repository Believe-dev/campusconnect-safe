-- Test script to verify user deletion functionality
-- Run this in Supabase SQL editor to test the delete_user_account function

-- 1. Check if the delete_user_account function exists
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'delete_user_account';

-- 2. Check what tables contain user data (to verify what needs to be deleted)
SELECT 
    table_name,
    column_name
FROM information_schema.columns 
WHERE column_name IN ('user_id', 'buyer_id', 'seller_id', 'reported_by', 'reviewer_id', 'reviewed_id')
AND table_schema = 'public'
ORDER BY table_name, column_name;

-- 3. Example of checking user data before deletion (replace with actual user_id)
/*
-- Check all data for a specific user (replace 'USER_ID_HERE' with actual UUID)
SELECT 'profiles' as table_name, count(*) as count FROM profiles WHERE user_id = 'USER_ID_HERE'
UNION ALL
SELECT 'products', count(*) FROM products WHERE seller_id = 'USER_ID_HERE'
UNION ALL
SELECT 'orders_as_buyer', count(*) FROM orders WHERE buyer_id = 'USER_ID_HERE'
UNION ALL
SELECT 'orders_as_seller', count(*) FROM orders WHERE seller_id = 'USER_ID_HERE'
UNION ALL
SELECT 'cart', count(*) FROM cart WHERE user_id = 'USER_ID_HERE'
UNION ALL
SELECT 'favorites', count(*) FROM favorites WHERE user_id = 'USER_ID_HERE'
UNION ALL
SELECT 'notifications', count(*) FROM notifications WHERE user_id = 'USER_ID_HERE'
UNION ALL
SELECT 'reviews_given', count(*) FROM reviews WHERE reviewer_id = 'USER_ID_HERE'
UNION ALL
SELECT 'reviews_received', count(*) FROM reviews WHERE reviewed_id = 'USER_ID_HERE'
UNION ALL
SELECT 'product_reports', count(*) FROM product_reports WHERE reported_by = 'USER_ID_HERE'
UNION ALL
SELECT 'user_roles', count(*) FROM user_roles WHERE user_id = 'USER_ID_HERE'
UNION ALL
SELECT 'conversations_as_buyer', count(*) FROM conversations WHERE buyer_id = 'USER_ID_HERE'
UNION ALL
SELECT 'conversations_as_seller', count(*) FROM conversations WHERE seller_id = 'USER_ID_HERE';
*/

-- 4. Test the function (DO NOT RUN WITH REAL USER ID unless you want to delete that user)
/*
SELECT delete_user_account('TEST_USER_ID_HERE');
*/

-- 5. Check function permissions
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges 
WHERE routine_name = 'delete_user_account';