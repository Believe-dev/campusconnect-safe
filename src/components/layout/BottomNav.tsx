import { ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, MotionConfig } from "framer-motion";
import { cn } from "@/lib/utils";
import { Store, Zap, MessageCircle, Plus } from "lucide-react";
import { ShoppingCartIcon, UserIcon } from "@/components/ui/heroicons";
import { useCartCount } from "@/contexts/CartCountContext";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/contexts/ProfileContext";
import { useUniMarketNavigation } from "@/hooks/useUniMarketNavigation";
import { useLiveFeedNotifications } from "@/hooks/useLiveFeedNotifications";
import { useMessageCount } from "@/contexts/MessageCountContext";
import { ProfileSheet } from "@/components/layout/ProfileSheet";

// The label is always rendered (never conditionally mounted/unmounted) so
// it can animate smoothly from 0 to its natural width via a grid-template-
// columns transition — the standard trick for animating "auto" width,
// since width itself can't be transitioned to an unknown value. Mounting/
// unmounting a plain conditional span instead would make the pill jump to
// its new size instantly rather than grow into it.
// bottom-nav-force-motion (see index.css / accessibility.css) keeps this
// transition playing even when the OS "Reduce Motion" setting is on — the
// active-tab indicator is a functional navigation cue, not decorative
// motion, so it's deliberately exempted from the site-wide reduced-motion
// override rather than silently doing nothing on devices with that setting.
const AnimatedTabLabel = ({ active, children }: { active: boolean; children: ReactNode }) => (
  <span
    className={cn(
      "bottom-nav-force-motion relative z-10 grid overflow-hidden whitespace-nowrap transition-[grid-template-columns] duration-300 ease-out",
      active ? "grid-cols-[1fr]" : "grid-cols-[0fr]"
    )}
  >
    <span className="overflow-hidden">{children}</span>
  </span>
);

// Framer Motion's shared layoutId: when the element carrying this id
// unmounts from one button and mounts on another (because the active tab
// moved), Motion animates the transform/size between the two positions
// automatically (FLIP) instead of an instant jump. Defined at module scope
// rather than inside BottomNav — a component defined inside another
// component's body gets a new function identity every render, which would
// make React treat it as a different type and force an unnecessary
// remount (breaking animation continuity) on every unrelated re-render,
// not just when the active tab actually changes.
const ActiveHighlight = () => (
  <motion.div
    layoutId="bottom-nav-active-pill"
    className="absolute inset-0 rounded-full bg-white"
    transition={{ type: "spring", stiffness: 500, damping: 35 }}
  />
);

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { cartCount } = useCartCount();
  const { messagesCount } = useMessageCount();
  const { unreadCount: liveFeedUnreadCount, markAsRead: markLiveFeedAsRead } =
    useLiveFeedNotifications();
  const { goToMarketplace, goToLiveFeed, goToCart, goToMessages } =
    useUniMarketNavigation();
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  // Closes the sheet on any navigation — otherwise tapping a different tab
  // while it's open would leave it floating over the newly-navigated-to
  // page, since changing routes doesn't touch this component's own state.
  useEffect(() => {
    setIsProfileSheetOpen(false);
  }, [location.pathname]);

  // Hidden on chat pages, and on product detail pages — the latter has its
  // own full-width sticky "Add to Cart" bar on mobile that's meant to
  // replace this nav (same reasoning as Cart's checkout flow), not stack
  // on top of it.
  const isInChat = location.pathname.startsWith("/chat/");
  const isProductDetail = location.pathname.startsWith("/product/");
  const isHidden = !user || isInChat || isProductDetail;

  // index.css only reserves the fixed bottom nav's height on body when this
  // class is present — without it, any page where the nav is hidden (e.g.
  // every page for a logged-out visitor, not just this one) was left with a
  // dead ~68px gap at the bottom from body's own padding.
  useEffect(() => {
    document.body.classList.toggle("has-fixed-bottom-nav", !isHidden);
    return () => {
      document.body.classList.remove("has-fixed-bottom-nav");
    };
  }, [isHidden]);

  if (isHidden) return null;

  const canSell =
    profile?.account_type !== "buyer" && profile?.seller_status === "approved";

  // Cart is unconditional now — Sell has its own floating action button
  // above the bar instead of swapping into this slot, so every user (buyer
  // or seller) always sees the same 5 tabs.
  const navItems = [
    { to: "/marketplace", icon: Store, label: "Shop", onClick: goToMarketplace },
    {
      to: "/live-feed",
      icon: Zap,
      label: "Live",
      badge: liveFeedUnreadCount,
      onClick: () => {
        markLiveFeedAsRead();
        goToLiveFeed();
      },
    },
    { to: "/cart", icon: ShoppingCartIcon, label: "Cart", badge: cartCount, onClick: goToCart },
    { to: "/messages", icon: MessageCircle, label: "Chat", badge: messagesCount, onClick: goToMessages },
  ];

  const isProfileActive = location.pathname === "/profile";

  // Matches the reference BottomNav's pill tab: active shows a white pill
  // with its label, inactive is icon-only at reduced opacity. The white
  // pill itself is a shared-layout motion.div (see ActiveHighlight below)
  // rather than a per-button background color, so it slides between tabs
  // instead of independently fading out in one place and in in another.
  const tabClassName = (active: boolean) =>
    cn(
      "bottom-nav-force-motion relative flex items-center gap-1.5 rounded-full px-3 py-2.5 text-sm font-medium transition-colors duration-300 ease-out",
      active ? "text-flora-ink" : "text-white/70 hover:text-white"
    );

  return (
    // reducedMotion="never": guarantees the sliding highlight (ActiveHighlight
    // below) always animates via Framer Motion's own engine, independent of
    // the CSS-level exemption above which only covers plain CSS transitions.
    <MotionConfig reducedMotion="never">
    <nav
      className="force-fixed-bottom transition-all duration-300 ease-out"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100vw",
        zIndex: 9997,
        pointerEvents: "auto",
      }}
    >
      <div
        className="flex flex-col items-end gap-2 px-4"
        style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))", paddingTop: "8px" }}
      >
        {/* Sell floating action button — sits directly above the pill bar
            since both live in this same flex-col wrapper, instead of being
            positioned independently against a guessed pixel offset. Only
            rendered for approved sellers; everyone else's Cart tab below
            covers their needs. */}
        {canSell && (
          <button
            type="button"
            aria-label="Sell an item"
            onClick={() => (window.location.href = "/sell")}
            className="flex items-center gap-1.5 rounded-full bg-flora-ink px-4 py-3 text-sm font-medium text-white shadow-floating transition hover:brightness-110 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            Sell
          </button>
        )}

        <div className="flex w-full justify-center">
          <div className="flex items-center gap-1 rounded-full bg-flora-ink p-1.5 shadow-floating">
            {navItems.map(({ to, icon: Icon, label, badge, onClick }) => {
              const isActive =
                location.pathname === to ||
                (to === "/marketplace" && location.pathname.startsWith("/marketplace"));

              return (
                <button key={to} onClick={onClick} aria-label={label} aria-current={isActive ? "page" : undefined} className={tabClassName(isActive)}>
                  {isActive && <ActiveHighlight />}
                  <Icon className="relative z-10 h-5 w-5 shrink-0" aria-hidden="true" />
                  <AnimatedTabLabel active={isActive}>{label}</AnimatedTabLabel>
                  {badge > 0 && (
                    <span className="absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Profile opens a full-page sheet (ProfileSheet) rather
                than a small anchored dropdown — the bottom nav itself
                stays on top (z-index below only the nav), so the user can
                still switch tabs directly without closing the sheet
                first. */}
            <button
              aria-label="Profile"
              aria-current={isProfileActive ? "page" : undefined}
              aria-expanded={isProfileSheetOpen}
              onClick={() => setIsProfileSheetOpen((open) => !open)}
              className={tabClassName(isProfileActive || isProfileSheetOpen)}
            >
              {(isProfileActive || isProfileSheetOpen) && <ActiveHighlight />}
              <UserIcon className="relative z-10 h-5 w-5 shrink-0" />
              <AnimatedTabLabel active={isProfileActive || isProfileSheetOpen}>
                Profile
              </AnimatedTabLabel>
            </button>
          </div>
        </div>
      </div>
    </nav>
    <ProfileSheet open={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen} />
    </MotionConfig>
  );
};

export default BottomNav;
