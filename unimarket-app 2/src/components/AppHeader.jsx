import {
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  BellIcon,
  BuildingStorefrontIcon,
  BoltIcon,
  ShoppingCartIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import IconButton from "./IconButton";

/**
 * variant="home": logo + search on mobile, logo + inline search bar + nav
 * icons on md+.
 *
 * variant="back": back button + title on mobile, same plus nav icons on
 * md+ (so shop/live/cart/chat stay reachable without the bottom tab bar,
 * which is hidden at that breakpoint).
 *
 * Notifications is the one icon shown at every breakpoint — everything
 * else in the desktop cluster (marketplace/live/cart/chat, the Sell
 * button, the avatar) is md+ only, since mobile reaches those same
 * destinations through the bottom tab bar and its own Sell FAB instead
 * (see BottomNav).
 */
export default function AppHeader({
  variant = "home",
  title,
  onBack,
  onNavigate,
  cartCount = 0,
  liveCount = 0,
  notificationCount = 0,
  messageCount = 0,
  canSell = false,
  user = null, // { name, avatarUrl } | null — null renders a "Sign in" link instead of the avatar
}) {
  return (
    <header className="sticky top-0 z-30 bg-flora-bgFrom/90 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6">
        {variant === "home" ? (
          <>
            <a href="/" className="text-lg font-semibold text-flora-leaf">
              UniMarket
            </a>

            <form
              role="search"
              className="hidden flex-1 items-center gap-2 md:flex"
              onSubmit={(e) => e.preventDefault()}
            >
              <label htmlFor="site-search" className="sr-only">
                Search products
              </label>
              <div className="flex flex-1 items-center gap-2 rounded-full border border-flora-ink/10 bg-white px-4 py-2.5 shadow-card">
                <MagnifyingGlassIcon className="h-4 w-4 text-flora-muted" aria-hidden="true" />
                <input
                  id="site-search"
                  type="search"
                  placeholder="Search products, categories..."
                  className="w-full bg-transparent text-sm text-flora-ink placeholder:text-flora-muted focus:outline-none"
                />
              </div>
            </form>

            <IconButton
              icon={MagnifyingGlassIcon}
              label="Search"
              size="sm"
              tone="ghost"
              className="ml-auto md:hidden"
              onClick={() => onNavigate?.("search")}
            />
          </>
        ) : (
          <>
            <IconButton icon={ChevronLeftIcon} label="Go back" tone="ghost" onClick={onBack} />
            <h1 className="text-lg font-semibold text-flora-ink">{title}</h1>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <IconButton
            icon={BellIcon}
            label="Notifications"
            size="sm"
            tone="ghost"
            badge={notificationCount || null}
            onClick={() => onNavigate?.("notifications")}
          />

          <div className="hidden items-center gap-2 md:flex">
            <IconButton
              icon={BuildingStorefrontIcon}
              label="Marketplace"
              size="sm"
              tone="ghost"
              onClick={() => onNavigate?.("shop")}
            />
            <IconButton
              icon={BoltIcon}
              label="Live"
              size="sm"
              tone="ghost"
              badge={liveCount || null}
              onClick={() => onNavigate?.("live")}
            />
            <IconButton
              icon={ShoppingCartIcon}
              label="Cart"
              size="sm"
              tone="ghost"
              badge={cartCount || null}
              onClick={() => onNavigate?.("cart")}
            />
            <IconButton
              icon={ChatBubbleLeftRightIcon}
              label="Chat"
              size="sm"
              tone="ghost"
              badge={messageCount || null}
              onClick={() => onNavigate?.("chat")}
            />

            {canSell && (
              <button
                type="button"
                onClick={() => onNavigate?.("sell")}
                className="flex items-center gap-1.5 rounded-full bg-flora-leaf px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:brightness-105 active:scale-95"
              >
                <PlusIcon className="h-4 w-4" aria-hidden="true" />
                Sell
              </button>
            )}

            {user ? (
              <button
                type="button"
                onClick={() => onNavigate?.("profile")}
                aria-label="Profile"
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-flora-ink/10 shadow-card transition hover:brightness-105 active:scale-95"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-flora-leaf text-sm font-semibold text-white">
                    {user.name?.[0]?.toUpperCase() ?? "?"}
                  </span>
                )}
              </button>
            ) : (
              <a
                href="/auth"
                className="rounded-full bg-flora-ink px-4 py-2.5 text-sm font-semibold text-white shadow-card transition hover:brightness-105"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
