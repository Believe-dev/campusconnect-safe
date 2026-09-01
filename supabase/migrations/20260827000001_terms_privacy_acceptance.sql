-- Adds per-user Terms of Service / Privacy Policy acceptance tracking with
-- versioning (not just a boolean), so a future document update can trigger
-- a one-time re-consent gate for every user again. The app's current
-- required version numbers live in src/lib/legalVersions.ts
-- (CURRENT_TERMS_VERSION / CURRENT_PRIVACY_VERSION), not in the database -
-- bumping a document's required version is a frontend constant change, not
-- a migration.
--
-- All four columns start NULL for every existing user. That's intentional:
-- NULL is treated identically to "version below current" by the re-consent
-- gate, so shipping this migration is itself what surfaces the one-time
-- re-consent prompt to the whole existing user base - no separate
-- "first-time" flag or backfill logic needed.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_version INTEGER,
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS privacy_accepted_version INTEGER,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.terms_accepted_version IS
  'Version of the Terms of Service this user last accepted. NULL = never accepted. Compare against CURRENT_TERMS_VERSION in src/lib/legalVersions.ts.';
COMMENT ON COLUMN public.profiles.terms_accepted_at IS
  'Timestamp of the most recent Terms of Service acceptance.';
COMMENT ON COLUMN public.profiles.privacy_accepted_version IS
  'Version of the Privacy Policy this user last accepted. NULL = never accepted. Compare against CURRENT_PRIVACY_VERSION in src/lib/legalVersions.ts.';
COMMENT ON COLUMN public.profiles.privacy_accepted_at IS
  'Timestamp of the most recent Privacy Policy acceptance.';
