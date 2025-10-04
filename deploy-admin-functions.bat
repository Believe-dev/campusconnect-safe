@echo off
echo Deploying Admin Edge Functions to Supabase...

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

REM Deploy the admin-reset-password function
echo Deploying admin-reset-password function...
supabase functions deploy admin-reset-password

REM Deploy other admin functions
echo Deploying process-payout function...
supabase functions deploy process-payout

echo Deploying delete-account function...
supabase functions deploy delete-account

echo Deploying export-user-data function...
supabase functions deploy export-user-data

echo Deploying send-email function...
supabase functions deploy send-email

REM Set environment variables (these should already be set, but just in case)
echo Setting environment variables...
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_67ccaee369fb6200cfbc3715907daeeeb425c8ef

echo All admin Edge Functions deployed successfully!
echo You can now test the admin functions in the dashboard.
pause