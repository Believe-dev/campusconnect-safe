import { useNavigate } from "react-router-dom";
import { PauseCircle } from "lucide-react";

interface FeaturePausedProps {
  feature: string;
  message?: string;
}

// Route-level placeholder for a feature that's deliberately paused rather
// than removed — swap the route's element to this instead of deleting the
// page/component, so re-enabling later is a one-line revert (see App.tsx's
// /live-feed and /games routes). Keeps every entry-point-removal (nav,
// menus) backed by an actual inaccessible route, not just hidden links.
export const FeaturePaused = ({ feature, message }: FeaturePausedProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-flora-bgFrom to-flora-bgTo px-4">
      <div className="max-w-sm rounded-4xl bg-flora-card p-8 text-center shadow-card">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-flora-chip text-flora-muted">
          <PauseCircle className="h-7 w-7" />
        </div>
        <h1 className="text-lg font-semibold text-flora-ink">{feature} is taking a break</h1>
        <p className="mt-2 text-sm text-flora-muted">
          {message || `${feature} is temporarily paused. Check back later.`}
        </p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-6 rounded-full bg-flora-ink px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default FeaturePaused;
