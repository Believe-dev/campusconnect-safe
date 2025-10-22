@echo off
echo Fixing payout constraint issue...
echo.

echo Running migration to fix transfer_status constraint...
supabase db push --include-all

echo.
echo Migration completed! The payout system should now work properly.
echo.
echo The error "new row for relation payout_requests violates check constraint payout_requests_transfer_status_check" should be resolved.
echo.
pause