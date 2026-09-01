// Single source of truth for "which version of the Terms/Privacy Policy is
// currently required." Bump either constant whenever the corresponding
// document changes materially - every user whose stored
// profiles.terms_accepted_version / privacy_accepted_version is lower than
// this (including everyone, the first time these columns are backfilled)
// will be shown the re-consent gate again until they accept.
export const CURRENT_TERMS_VERSION = 1;
export const CURRENT_PRIVACY_VERSION = 1;
