@echo off
echo ========================================
echo    FIXING PAYOUT SYSTEM
echo ========================================
echo.

echo Step 1: Running database migrations...
supabase db push

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to run migrations
    pause
    exit /b 1
)

echo.
echo Step 2: Deploying updated process-payout function...
supabase functions deploy process-payout

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to deploy function
    pause
    exit /b 1
)

echo.
echo ========================================
echo    PAYOUT SYSTEM FIXED! ✅
echo ========================================
echo.
echo What was fixed:
echo - Updated process-payout Edge Function with better error handling
echo - Added simulation mode for development/testing
echo - Fixed transfer tracking in database
echo - Added proper status management
echo.
echo Next steps:
echo 1. Configure Paystack (run setup-paystack.bat)
echo 2. Test payout approval in admin dashboard
echo.
echo The system now works in two modes:
echo - SIMULATION MODE: When Paystack key is not configured (for testing)
echo - REAL MODE: When Paystack key is properly configured (for production)
echo.

pause