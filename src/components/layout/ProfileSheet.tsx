import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronRight, Settings, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useProfileMenuItems,
  type ProfileMenuItem,
} from "@/components/layout/useProfileMenuItems";

const getInitials = (name: string | undefined) => {
  if (!name || name.trim() === "") return "U";
  const words = name
    .trim()
    .split(" ")
    .filter((word) => word.length > 0);
  if (words.length === 0) return "U";
  return words
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Full-page takeover shared by the mobile "Profile" tab and the desktop
 * avatar trigger — one surface instead of a small anchored dropdown on
 * desktop and a separate full-page sheet on mobile. z-index sits just
 * under the bottom nav pill (z-9997) on mobile so the nav stays visible
 * and tappable on top of this sheet, letting the user switch tabs
 * directly without closing the sheet first; desktop has no such nav to
 * clear so that ordering is simply irrelevant there.
 */
export const ProfileSheet = ({ open, onOpenChange }: ProfileSheetProps) => {
  const {
    user,
    profile,
    sellerDashboard,
    primary,
    secondary,
    handleSignOut,
    SignOutIcon,
  } = useProfileMenuItems();

  if (!user) return null;

  const renderItem = ({
    key,
    to,
    label,
    icon: Icon,
    badge,
    onClick,
  }: ProfileMenuItem) => (
    <Link
      key={key}
      to={to}
      onClick={() => {
        onClick?.();
        onOpenChange(false);
      }}
      className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 shadow-card transition hover:brightness-105 active:scale-[0.99]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flora-chip text-flora-leaf">
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1 truncate text-sm font-medium text-flora-ink">
        {label}
      </span>
      {!!badge && badge > 0 && (
        <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-flora-muted" />
    </Link>
  );

  // Portaled straight to document.body rather than rendered in place: the
  // desktop Header calls this as a child of its own `position: fixed`
  // header element, and depending on the ancestor chain that can make this
  // sheet's own `fixed inset-0` resolve against the wrong containing block
  // — the exact symptom being just a strip pinned near the top instead of
  // covering the full viewport, since it inherited the header's small box
  // instead of the true viewport. Portaling guarantees a full-viewport
  // fixed position regardless of where the component is called from.
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
          className="fixed inset-0 z-[9990] flex flex-col overflow-y-auto bg-flora-bgFrom"
          style={{
            paddingTop: "max(1.25rem, env(safe-area-inset-top))",
            // Clears the floating bottom-nav pill on mobile (roughly its
            // height plus the gap it floats above) so the sign-out row is
            // never hidden underneath it. Harmless extra space on desktop,
            // which has no bottom nav to clear.
            paddingBottom: "calc(88px + max(6px, env(safe-area-inset-bottom)))",
          }}>
          <div className="mx-auto w-full max-w-3xl px-5">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold text-flora-ink">Menu</h1>
              <div className="flex items-center gap-2">
                <Link
                  to="/settings"
                  aria-label="Settings"
                  onClick={() => onOpenChange(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-flora-ink backdrop-blur-sm transition hover:bg-white/90">
                  <Settings className="h-5 w-5" />
                </Link>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => onOpenChange(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-flora-ink backdrop-blur-sm transition hover:bg-white/90">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <Link
              to="/profile"
              onClick={() => onOpenChange(false)}
              className="mt-5 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-card transition hover:brightness-105 active:scale-[0.99]">
              <Avatar className="h-14 w-14 avatar-stable ring-2 ring-flora-chip">
                <AvatarImage
                  src={profile?.avatar_url}
                  alt={profile?.full_name}
                />
                <AvatarFallback className="bg-flora-leaf text-white font-semibold">
                  {profile?.full_name ? getInitials(profile.full_name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <p className="truncate font-semibold text-flora-ink">
                  {profile?.full_name}
                </p>
                <p className="truncate text-sm text-flora-muted">
                  {user.email}
                </p>
                <span className="mt-1 w-fit rounded-full bg-flora-tagBg px-2 py-0.5 text-xs font-medium text-flora-tagText">
                  {profile?.account_type}
                </span>
              </div>
            </Link>

            {sellerDashboard && (
              <Link
                to={sellerDashboard.to}
                onClick={() => onOpenChange(false)}
                className="group mt-5 flex items-center justify-between gap-4 rounded-3xl bg-flora-ink px-5 py-4 text-white shadow-floating transition hover:brightness-110 active:scale-[0.99]">
                <div className="min-w-0">
                  <p className="font-bold">{sellerDashboard.label}</p>
                  <p className="mt-0.5 text-sm text-white/70">
                    Orders, wallet &amp; listings
                  </p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flora-leafBright text-flora-ink transition group-hover:translate-x-0.5">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
              </Link>
            )}

            <div className="mt-5 space-y-2">{primary.map(renderItem)}</div>

            <div className="my-5 h-px bg-flora-ink/10" />

            <div className="space-y-2">{secondary.map(renderItem)}</div>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  handleSignOut();
                }}
                className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-base text-destructive shadow-card transition-colors hover:bg-destructive/5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <SignOutIcon className="h-5 w-5" />
                </span>
                <span className="flex-1 text-left font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default ProfileSheet;
