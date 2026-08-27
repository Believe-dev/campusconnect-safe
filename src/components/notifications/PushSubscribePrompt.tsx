import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToPush } from "@/utils/webPush";

const DISMISSED_KEY = "push-prompt-dismissed";

/**
 * Replaces the old behavior of silently requesting notification permission
 * on every page load (three separate mechanisms used to do this at once,
 * unprompted). This is the single, intentional opt-in moment instead —
 * shown once per browser, only to a signed-in user, only if permission is
 * still undecided.
 *
 * Positioned and timed to never collide with PWAInstallPrompt (which uses
 * the `force-fixed-pwa` slot and shows at ~5s) — this shows sooner, higher
 * up, clearing the bottom nav rather than sharing PWAInstallPrompt's spot.
 */
export const PushSubscribePrompt = () => {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISSED_KEY) === "true") return;

    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  const handleEnable = async () => {
    setSubscribing(true);
    await subscribeToPush();
    setSubscribing(false);
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-4 z-40 mx-auto flex max-w-sm items-start gap-3 rounded-2xl bg-white p-4 shadow-floating animate-in slide-in-from-bottom-4 duration-300"
      style={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flora-chip text-flora-leaf">
        <Bell className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-flora-ink">Stay in the loop</p>
        <p className="mt-0.5 text-xs leading-relaxed text-flora-muted">
          Get notified about new messages and order updates.
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleEnable}
            disabled={subscribing}
            className="rounded-full bg-flora-ink px-3.5 py-1.5 text-xs font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {subscribing ? "Enabling…" : "Enable"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-flora-muted transition hover:bg-flora-chip"
          >
            Not now
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-flora-muted transition hover:bg-flora-chip"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default PushSubscribePrompt;
