@echo off
echo Deploying process-payout Edge Function...

REM Deploy the process-payout function
supabase functions deploy process-payout

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ process-payout function deployed successfully!
    echo.
    echo The function now supports:
    echo - Real Paystack transfers (when PAYSTACK_SECRET_KEY is configured)
    echo - Simulation mode for development/testing
    echo - Better error handling and logging
    echo.
    echo Make sure to set your environment variables:
    echo supabase secrets set PAYSTACK_SECRET_KEY=your_actual_paystack_secret_key
    echo.
) else (
    echo.
    echo ❌ Failed to deploy process-payout function
    echo Make sure you're logged in to Supabase CLI and have the correct project linked
    echo.
)

pause