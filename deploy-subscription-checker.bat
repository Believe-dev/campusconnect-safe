@echo off
echo Deploying seller subscription checker...

REM Deploy the Edge Function
supabase functions deploy check-expired-subscriptions

REM Create a cron job using pg_cron (run this SQL in your Supabase SQL editor)
echo.
echo Please run this SQL in your Supabase SQL editor to set up daily checks:
echo.
echo -- Enable pg_cron extension
echo CREATE EXTENSION IF NOT EXISTS pg_cron;
echo.
echo -- Schedule daily subscription check at 00:01 UTC
echo SELECT cron.schedule(
echo   'check-expired-subscriptions',
echo   '1 0 * * *',
echo   'SELECT net.http_post(
echo     url := ''https://your-project-ref.supabase.co/functions/v1/check-expired-subscriptions'',
echo     headers := jsonb_build_object(''Authorization'', ''Bearer '' || current_setting(''app.settings.service_role_key''))
echo   );'
echo );
echo.
echo Replace 'your-project-ref' with your actual Supabase project reference.
echo.
pause