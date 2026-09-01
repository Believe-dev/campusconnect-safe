import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLegalAcceptance } from "@/hooks/useLegalAcceptance";
import { ScrollText } from "lucide-react";

// The two pages this links to are excluded so a user can actually read them
// unobstructed - without this, clicking either link (even in a new tab,
// since that tab mounts the same app shell) would show this same gate on
// top of the very document it's asking them to review.
const LEGAL_PAGE_PATHS = ["/terms-of-service", "/privacy-policy"];

// Non-dismissible: onOpenChange is a no-op, same pattern as
// BannedUserModal. Mounted alongside the rest of the app (not replacing
// it, unlike the ban check) - its own Dialog backdrop is what blocks
// interaction with everything underneath until accepted.
export const ReconsentGate = () => {
  const { needsReconsent, loading, acceptCurrentVersions } = useLegalAcceptance();
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  if (loading || !needsReconsent || LEGAL_PAGE_PATHS.includes(location.pathname)) {
    return null;
  }

  const handleAccept = async () => {
    if (!checked || submitting) return;
    setSubmitting(true);
    const ok = await acceptCurrentVersions();
    setSubmitting(false);
    if (!ok) {
      toast({
        title: "Couldn't save your acceptance",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-flora-ink">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-flora-chip text-flora-leaf">
              <ScrollText className="h-4 w-4" />
            </span>
            Updated Terms &amp; Privacy Policy
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-flora-muted">
            We've updated our Terms of Service and Privacy Policy. Please review and accept
            them to continue using UniMarket.
          </p>

          <label className="flex items-start gap-2.5 text-left text-sm text-flora-ink">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-flora-ink/30 text-flora-leaf focus:ring-2 focus:ring-flora-leaf/40"
            />
            <span>
              I agree to the{" "}
              <Link
                to="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-flora-leaf underline"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-flora-leaf underline"
              >
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button
            type="button"
            onClick={handleAccept}
            disabled={!checked || submitting}
            className="w-full rounded-full bg-flora-ink py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Saving..." : "Accept & Continue"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReconsentGate;
