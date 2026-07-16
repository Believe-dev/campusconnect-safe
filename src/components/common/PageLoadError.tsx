import { AlertTriangle } from "lucide-react";

// Used as the .catch() fallback on every lazy-loaded route in App.tsx —
// shown when a chunk fails to load, most commonly a stale cached page
// still referencing chunk hashes from before a new deploy. A retry can't
// fix that (the browser needs to re-fetch the current build's manifest),
// so this only offers a hard refresh, unlike ErrorBoundary's fallback.
export const PageLoadError = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-flora-bgFrom to-flora-bgTo px-4">
    <div className="w-full max-w-md rounded-4xl bg-white/70 p-8 text-center shadow-card backdrop-blur-sm">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-flora-chip">
        <AlertTriangle className="h-8 w-8 text-flora-muted" aria-hidden="true" />
      </div>
      <h1 className="mb-2 text-xl font-semibold text-flora-ink">
        Error Loading Page
      </h1>
      <p className="mb-6 text-sm text-flora-muted">
        This usually clears up with a refresh — often it just means the app
        was updated since you last loaded it.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-full bg-flora-ink px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-110">
        Refresh Page
      </button>
    </div>
  </div>
);