-- Adds the date-of-birth column the signup flow now collects to enforce the
-- 18+ eligibility floor already asserted in Terms of Service Section 2 and
-- Privacy Policy Section 6, but never actually enforced or stored anywhere
-- until now. Written by the client (SignupPage.tsx's recordLegalAcceptance)
-- shortly after auth.signUp(), same as terms_accepted_at/privacy_accepted_at -
-- not by handle_new_user().

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth DATE;

COMMENT ON COLUMN public.profiles.date_of_birth IS
  'Self-reported date of birth, collected at signup to enforce the 18+ eligibility requirement in the Terms of Service and Privacy Policy. Age is validated client-side (isAtLeast18 in SignupPage.tsx) before this is written.';
