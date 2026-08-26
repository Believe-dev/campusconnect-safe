// Sitewide maintenance mode — single flag checked once, at the top of App.tsx.
// Flip VITE_MAINTENANCE_MODE back to "false" (and redeploy) to bring the site back.
//
// This never touches api/*.js (Vercel functions) or supabase/functions/*
// (Edge Functions) — those are separate deploy targets that don't go
// through React Router at all, so they keep working regardless of this flag.

export const isMaintenanceMode = () =>
  import.meta.env.VITE_MAINTENANCE_MODE === "true";

// Visiting this path grants this browser a bypass cookie and redirects home.
// Not linked from anywhere in the UI and deliberately excluded from the sitemap.
export const MAINTENANCE_BYPASS_PATH =
  import.meta.env.VITE_MAINTENANCE_BYPASS_PATH || "/preview-9f3k7x2q1a";

const BYPASS_COOKIE_NAME = "um_preview_access";
const BYPASS_COOKIE_VALUE =
  import.meta.env.VITE_MAINTENANCE_BYPASS_TOKEN || "uk7f-2m9x-preview";
const BYPASS_COOKIE_MAX_AGE_DAYS = 30;

export const hasMaintenanceBypass = (): boolean => {
  return document.cookie
    .split("; ")
    .some((row) => row === `${BYPASS_COOKIE_NAME}=${BYPASS_COOKIE_VALUE}`);
};

export const grantMaintenanceBypass = (): void => {
  const expires = new Date(
    Date.now() + BYPASS_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
  ).toUTCString();
  document.cookie = `${BYPASS_COOKIE_NAME}=${BYPASS_COOKIE_VALUE}; expires=${expires}; path=/; SameSite=Lax`;
};
