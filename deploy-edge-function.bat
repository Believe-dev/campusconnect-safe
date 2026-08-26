@echo off
echo Deploying Edge Function to Supabase...

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Supabase CLI not found. Installing...
    npm install -g supabase
)

REM Login to Supabase (if not already logged in)
echo Logging into Supabase...
supabase login

REM Link to your project
echo Linking to Supabase project...
supabase link --project-ref ssqplkrxtrvfptrsnpow

REM Deploy the Edge Function
REM NOTE: process-payout was removed - it was dead code that never made a real
REM transfer call while claiming success. Use anchor-withdraw for payouts instead.
supabase functions deploy anchor-withdraw

REM Set environment variables
REM Paystack is no longer in use - Anchor BaaS secrets (ANCHOR_API_KEY,
REM ANCHOR_WEBHOOK_TOKEN, ANCHOR_DEPOSIT_ACCOUNT_ID) should be set separately via
REM `supabase secrets set` with real values, not committed to this script.
echo Setting environment variables...
REM supabase secrets set PAYSTACK_SECRET_KEY=%PAYSTACK_SECRET_KEY%

echo Edge Function deployed successfully!
echo You can now test the payout flow in the wallet withdrawal modal.
pause