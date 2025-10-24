import { useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  Package,
  Heart,
  MessageCircle,
  Store,
  User,
  ShoppingCart,
  Zap,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCartCount } from "@/hooks/useCartCount";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/contexts/ProfileContext";
import { useUniMarketNavigation } from "@/hooks/useUniMarketNavigation";
import { useLiveFeedNotifications } from "@/hooks/useLiveFeedNotifications";

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { profile } = useProfile();
  const { cartCount } = useCartCount();
  const { unreadCount: liveFeedUnreadCount, markAsRead: markLiveFeedAsRead } =
    useLiveFeedNotifications();
  const { goToMarketplace, goToOrders, goToLiveFeed, goToCart, goToProfile } =
    useUniMarketNavigation();

  // Hide bottom nav only on chat pages
  const isInChat = location.pathname.startsWith("/chat/");

  if (!user || isInChat) return null;

  const GamepadIcon = () => (
    <svg
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );


  
  const navItems = [
    {
      to: "/marketplace",
      icon: Store,
      label: "Shop",
      onClick: goToMarketplace,
    },
    { to: "/orders", icon: Package, label: "Orders", onClick: goToOrders },
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
    // For sellers: Sell button, for buyers: Cart button
    profile?.account_type !== "buyer" ? {
      to: "/sell",
      icon: Plus,
      label: "Sell",
      onClick: () => window.location.href = "/sell",
    } : {
      to: "/cart",
      icon: ShoppingCart,
      label: "Cart",
      badge: cartCount,
      onClick: goToCart,
    },
    { to: "/profile", icon: User, label: "Profile", onClick: goToProfile },
  ];

  return (
    /*
     * Fixed bottom navigation - always visible at bottom of viewport
     * Uses position: fixed with bottom: 0 to stay at screen bottom
     * z-index: 1050 ensures it appears above other content
     * Content padding prevents overlap with scrollable content
     */
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
        className="bg-white border-t border-gray-200 shadow-sm"
        style={{
          paddingBottom: "max(6px, env(safe-area-inset-bottom))",
          minHeight: "56px",
        }}
      >
        {/* Navigation items container with balanced spacing */}
        <div className="flex justify-around items-center py-1.5 px-2">
          {navItems.map(({ to, icon: Icon, label, badge, onClick }) => {
            const isActive =
              location.pathname === to ||
              (to === "/marketplace" &&
                location.pathname.startsWith("/marketplace"));

            return (
              <button
                key={to}
                onClick={onClick}
                className={cn(
                  "flex flex-col items-center gap-1 p-1.5 rounded-lg min-w-0 flex-1 relative transition-all duration-200",
                  isActive ? "text-university-green" : "text-gray-500"
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-4.5 w-4.5 transition-all duration-200",
                      isActive ? "text-university-green" : "text-gray-500"
                    )}
                    style={{ WebkitAppearance: "none", appearance: "none", width: "18px", height: "18px" }}
                  />
                  {badge !== undefined && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-3.5 w-3.5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white border border-white shadow-sm notification-badge"
                      style={{
                        WebkitAppearance: "none",
                        appearance: "none",
                        minWidth: "14px",
                        minHeight: "14px",
                        fontSize: "10px",
                      }}
                    >
                      {badge > 99 ? "99+" : badge}
                    </Badge>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium truncate w-full text-center transition-all duration-200",
                    isActive
                      ? "text-university-green font-semibold"
                      : "text-gray-500"
                  )}
                  style={{ fontSize: "11px" }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
