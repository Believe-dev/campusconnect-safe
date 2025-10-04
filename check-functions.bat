@echo off
echo Checking Supabase Edge Functions status...
echo.

REM Check if Supabase CLI is installed
supabase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Supabase CLI not found. Please install it first:
    echo    npm install -g supabase
    pause
    exit /b 1
)

echo ✅ Supabase CLI is installed

REM Check if project is linked
echo.
echo Checking project link...
supabase status >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Project not linked. Linking now...
    supabase link --project-ref ssqplkrxtrvfptrsnpow
) else (
    echo ✅ Project is linked
)

REM List deployed functions
echo.
echo Checking deployed Edge Functions...
supabase functions list

echo.
echo ==========================================
echo Required Admin Functions:
echo - admin-reset-password (for password reset)
echo - process-payout (for payout processing)
echo - send-email (for email notifications)
echo - delete-account (for account deletion)
echo - export-user-data (for data export)
echo.
echo If any functions are missing, run:
echo   deploy-admin-functions.bat
echo ==========================================

pause