@echo off
echo Setting up Paystack configuration for Edge Functions...
echo.

echo Please enter your Paystack Secret Key:
echo (For testing: sk_test_...)
echo (For production: sk_live_...)
echo.
set /p PAYSTACK_KEY="Paystack Secret Key: "

if "%PAYSTACK_KEY%"=="" (
    echo.
    echo ❌ No Paystack key provided. Exiting...
    pause
    exit /b 1
)

echo.
echo Setting Paystack secret in Supabase...
supabase secrets set PAYSTACK_SECRET_KEY=%PAYSTACK_KEY%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Paystack secret key configured successfully!
    echo.
    echo Your Edge Functions can now process real bank transfers.
    echo.
    echo To verify the setup, you can list all secrets:
    echo supabase secrets list
    echo.
) else (
    echo.
    echo ❌ Failed to set Paystack secret
    echo Make sure you're logged in to Supabase CLI and have the correct project linked
    echo.
)

pause