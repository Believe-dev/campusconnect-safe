@echo off
echo Fixing paid sellers visibility issue...
echo.
echo Please run the following SQL in your Supabase SQL editor:
echo.
echo 1. Go to your Supabase dashboard
echo 2. Navigate to SQL Editor
echo 3. Copy and paste the contents of fix_paid_sellers.sql
echo 4. Click "Run" to execute the fix
echo.
echo This will:
echo - Update existing paid sellers to have proper seller_status
echo - Create a trigger to prevent this issue in the future
echo - Show a count of fixed sellers
echo.
pause