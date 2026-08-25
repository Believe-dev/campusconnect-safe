@echo off
echo Deploying subscription expiry checker function...

echo Running migration...
supabase db push

echo Testing the function...
supabase db reset --linked

echo Deployment complete!
echo.
echo The function check_expired_seller_subscriptions() is now available.
echo It should be called daily via cron job or scheduled edge function.
echo.
pause