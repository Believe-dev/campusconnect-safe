-- get_verification_requests() exists in the live database but was never
-- tracked in any migration file in this repo (schema drift) - discovered via
-- `supabase gen types` after 20260904000001 dropped profiles.student_id_photo_url,
-- since this function's RETURNS TABLE includes that column and would now
-- error at call time. It isn't called from the frontend or any edge function
-- (VerificationRequest.tsx and Admin.tsx both build the same data via direct
-- client-side table queries instead), so it's dropped rather than repaired.

DROP FUNCTION IF EXISTS public.get_verification_requests();
