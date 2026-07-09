import { ChevronLeftIcon, MagnifyingGlassIcon, HeartIcon, ShoppingCartIcon } from "@heroicons/react/24/outline";
import IconButton from "./IconButton";

/**
 * variant="home": logo + search on mobile, logo + inline search bar + nav
 * icons on md+.
 *
 * variant="back": back button + title on mobile, same plus nav icons on
 * md+ (so cart/wishlist stay reachable without the bottom tab bar, which
 * is hidden at that breakpoint).
 */
export default function AppHeader({
  variant = "home",
  title,
  onBack,
  cartCount = 0,
  wishlistCount = 0,
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
            />
          </>
        ) : (
          <>
            <IconButton icon={ChevronLeftIcon} label="Go back" tone="ghost" onClick={onBack} />
            <h1 className="text-lg font-semibold text-flora-ink">{title}</h1>
          </>
        )}

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <IconButton icon={HeartIcon} label="Wishlist" tone="ghost" badge={wishlistCount || null} />
          <IconButton icon={ShoppingCartIcon} label="Cart" tone="ghost" badge={cartCount || null} />
        </div>
      </div>
    </header>
  );
}
