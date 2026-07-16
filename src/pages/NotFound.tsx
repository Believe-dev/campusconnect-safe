import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-flora-bgFrom to-flora-bgTo px-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="mb-8 inline-flex items-center gap-2">
          <img
            src="/logo.png"
            alt="UniMarket Logo"
            className="h-10 w-10 object-contain"
          />
          <span className="text-lg font-bold text-flora-leaf">UniMarket</span>
        </Link>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-flora-chip">
          <Compass className="h-8 w-8 text-flora-muted" aria-hidden="true" />
        </div>

        <p className="text-6xl font-extrabold tracking-tight text-flora-ink">
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold text-flora-ink">
          This page doesn't exist
        </h1>
        <p className="mt-2 text-sm text-flora-muted">
          The page you're looking for might have been moved or deleted.
        </p>

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="rounded-full bg-flora-ink px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-110">
            Back to Home
          </Link>
          <Link
            to="/marketplace"
            className="rounded-full border border-flora-ink/15 px-6 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip">
            Browse Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
