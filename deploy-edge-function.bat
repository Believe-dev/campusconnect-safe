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
echo Deploying process-payout function...
supabase functions deploy process-payout

REM Set environment variables
echo Setting environment variables...
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_67ccaee369fb6200cfbc3715907daeeeb425c8ef

echo Edge Function deployed successfully!
echo You can now test the payout approval in the admin dashboard.
pause