import { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ShoppingCart, Bell, MessageCircle, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCartCount } from "@/contexts/CartCountContext";
import { useNotifications } from "@/contexts/NotificationCountContext";
import { useMessageCount } from "@/contexts/MessageCountContext";
import { useProfile } from "@/contexts/ProfileContext";
import SmartSearchInput from "@/components/search/SmartSearchInput";
import MobileExpandableSearch from "@/components/search/MobileExpandableSearch";
import { ProfileSheet } from "@/components/layout/ProfileSheet";

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

// Each icon carries its own individual white circular background again.
// hover:text-flora-ink is load-bearing, not decorative: the underlying
// Button's ghost variant already sets hover:text-accent-foreground, which
// resolves to a near-white color (0 0% 98% — see index.css) — without this
// override, icons/text effectively disappear on hover instead of just
// changing background. Kept as a className override on the existing
// Button component rather than swapping components entirely, so focus/
// keyboard handling stays intact.
const iconButtonClass =
  "relative h-9 w-9 rounded-full bg-white text-flora-ink shadow-card transition hover:bg-flora-chip hover:text-flora-ink";

const Header = () => {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const { cartCount } = useCartCount();
  const { unreadCount } = useNotifications();
  const { messagesCount } = useMessageCount();
  // Same check BottomNav's floating "Sell" FAB and the ProfileSheet's Sell
  // tile already use — an approved seller, not just anyone who signed up
  // as one (seller_status still needs to clear verification first).
  const canSell =
    profile?.account_type !== "buyer" && profile?.seller_status === "approved";
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
  const navigate = useNavigate();

  // Hide header on chat pages, and on the auth page — the auth page has its
  // own back button instead (see SignupPage.tsx), since "Sign In / Join"
  // in the header makes no sense on the page that already is that flow.
  const isHidden =
    location.pathname.startsWith("/chat/") || location.pathname === "/auth";

  // Product detail pages have their own back button (over the gallery
  // image) instead of the site header on mobile — the header comes back at
  // sm: since desktop uses a normal in-flow image, not the mobile
  // full-width treatment that the back button is designed to sit on top of.
  const isProductDetail = location.pathname.startsWith("/product/");

  // index.css only reserves the fixed header's height on body when one of
  // these classes is present. Plain has-fixed-header reserves it at every
  // breakpoint; has-fixed-header-sm (product detail pages) only reserves it
  // from sm: up, matching the header's own "hidden sm:block" above — without
  // this split, mobile product-detail pages reserved 60px of body padding
  // for a header that CSS was hiding at that breakpoint, showing up as a
  // dead white bar above the gallery image.
  useEffect(() => {
    document.body.classList.toggle(
      "has-fixed-header",
      !isHidden && !isProductDetail,
    );
    document.body.classList.toggle(
      "has-fixed-header-sm",
      !isHidden && isProductDetail,
    );
    return () => {
      document.body.classList.remove("has-fixed-header", "has-fixed-header-sm");
    };
  }, [isHidden, isProductDetail]);

  if (isHidden) {
    return null;
  }

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header
      className={cn(
        "force-fixed-header",
        isProductDetail && "hidden sm:block",
      )}>
      <div className="bg-flora-bgFrom/90 backdrop-blur-sm">
        <div className="container mx-auto px-2">
          <div className="flex h-16 items-center justify-between gap-2">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-1.5 flex-shrink-0 micro-bounce transition-all duration-200">
              <img
                src="/logo.png"
                alt="UniMarket Logo"
                className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-sm object-contain"
              />
              <span className="text-sm sm:text-base font-bold text-flora-leaf">
                UniMarket
              </span>
            </Link>

            {/* Desktop search — capped instead of stretching to fill the
                row's full remaining space (flex-1 previously), so it reads
                as a normal-length search bar rather than a full-width one
                spanning almost the entire header. */}
            <div className="hidden lg:flex w-full max-w-4xl">
              <SmartSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                onSubmit={handleSearch}
                placeholder="Search products, categories..."
                autoFocus={false}
              />
            </div>

            {/* Mobile expandable search */}
            <div className="lg:hidden ml-auto">
              <MobileExpandableSearch />
            </div>

            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 sm:h-10 sm:w-10 bg-flora-chip rounded-full animate-pulse"></div>
                <div className="h-9 w-16 sm:h-10 sm:w-20 bg-flora-chip rounded-full animate-pulse"></div>
              </div>
            ) : user ? (
              <div className="flex items-center gap-2">
                {/* Mobile: bell stands alone — mobile reaches Shop/Live/
                    Cart/Chat via the bottom tab bar and Sell via its
                    floating action button, so this is the only icon the
                    mobile header needs beyond search. No Tooltip here:
                    touch devices can trigger Radix's hover/focus tooltip
                    on tap, which just shows an unwanted popover — an
                    aria-label covers the accessible name instead. */}
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  aria-label="Notifications"
                  className={cn(iconButtonClass, "lg:hidden")}>
                  <Link to="/notifications">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                    {unreadCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] font-bold rounded-full bg-red-500 text-white border border-background">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </Link>
                </Button>

                {/* Desktop: Sell (approved sellers only), Notifications,
                    Cart, and the Profile avatar — everything else (Shop,
                    Live, Chat, Orders, Settings, ...) lives one tap away
                    inside the full-page ProfileSheet instead of crowding
                    the header. Both unreadCount and cartCount come from
                    shared providers (NotificationCountContext/
                    CartCountContext) rather than a hook each component
                    calls independently, so this badge and the mobile
                    bell's badge are always reading the same live count
                    instead of two separate, possibly-lagging
                    subscriptions. */}
                <div className="hidden lg:flex items-center gap-2">
                  {canSell && (
                    <Button
                      asChild
                      className="h-9 gap-1 rounded-full bg-flora-ink px-4 text-sm font-medium text-white shadow-card transition hover:brightness-110"
                    >
                      <Link to="/sell">
                        <Plus className="h-4 w-4" />
                        Sell
                      </Link>
                    </Button>
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className={iconButtonClass}>
                        <Link to="/notifications">
                          <Bell className="h-5 w-5" />
                          {unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Notifications</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className={iconButtonClass}>
                        <Link to="/messages">
                          <MessageCircle className="h-5 w-5" />
                          {messagesCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                              {messagesCount > 99 ? "99+" : messagesCount}
                            </span>
                          )}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Messages</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className={iconButtonClass}>
                        <Link to="/cart">
                          <ShoppingCart className="h-5 w-5" />
                          {cartCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                              {cartCount > 99 ? "99+" : cartCount}
                            </span>
                          )}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cart</p>
                    </TooltipContent>
                  </Tooltip>

                  <Button
                    variant="ghost"
                    onClick={() => setIsProfileSheetOpen(true)}
                    aria-label="Profile"
                    aria-expanded={isProfileSheetOpen}
                    className="relative h-10 w-10 rounded-full bg-white p-0 shadow-card transition-all duration-200 hover:bg-flora-chip hover:text-flora-ink focus:ring-2 focus:ring-flora-leaf/30 focus:ring-offset-2">
                    <Avatar className="h-8 w-8 avatar-stable ring-2 ring-flora-ink/10 transition-all duration-200">
                      <AvatarImage
                        src={profile?.avatar_url}
                        alt={profile?.full_name}
                      />
                      <AvatarFallback className="bg-flora-leaf text-white font-semibold">
                        {profile?.full_name
                          ? getInitials(profile.full_name)
                          : "U"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-9 rounded-full text-xs sm:h-10 sm:text-sm px-3 sm:px-4 border-flora-ink/20 text-flora-ink hover:bg-white/60 micro-bounce">
                  <Link to="/auth?mode=signin">Sign In</Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="h-9 rounded-full text-xs sm:h-10 sm:text-sm px-3 sm:px-4 bg-flora-ink text-white hover:brightness-110 micro-bounce shadow-card">
                  <Link to="/auth?mode=signup">Join</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileSheet
        open={isProfileSheetOpen}
        onOpenChange={setIsProfileSheetOpen}
      />
    </header>
  );
};

export default Header;
