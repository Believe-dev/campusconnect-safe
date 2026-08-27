import {
  BuildingStorefrontIcon,
  BoltIcon,
  ShoppingCartIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";

const NAV_ITEMS = [
  { key: "shop", label: "Shop", icon: BuildingStorefrontIcon },
  { key: "live", label: "Live", icon: BoltIcon, badgeKey: "liveCount" },
  { key: "cart", label: "Cart", icon: ShoppingCartIcon, badgeKey: "cartCount" },
  { key: "chat", label: "Chat", icon: ChatBubbleLeftRightIcon, badgeKey: "chatCount" },
  { key: "profile", label: "Profile", icon: UserIcon },
];

/**
 * The Sell FAB lives here rather than in AppHeader, since "floating above
 * the tab bar" is really "positioned relative to this fixed bottom
 * container" — duplicating that positioning logic per-page would be more
 * fragile than owning it alongside the bar it floats above.
 */
export default function BottomNav({
  current = "shop",
  onNavigate,
  canSell = false,
  liveCount = 0,
  cartCount = 0,
  chatCount = 0,
}) {
  const counts = { liveCount, cartCount, chatCount };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col items-end gap-2 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:hidden">
      {canSell && (
        <button
          type="button"
          aria-label="Sell an item"
          onClick={() => onNavigate?.("sell")}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-flora-leaf text-white shadow-floating transition hover:brightness-105 active:scale-95"
        >
          <PlusIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      )}

      <nav aria-label="Primary" className="flex w-full justify-center">
        <div className="flex items-center gap-2 rounded-full bg-flora-ink p-2 shadow-floating">
          {NAV_ITEMS.map(({ key, label, icon: Icon, badgeKey }) => {
            const active = key === current;
            const badge = badgeKey ? counts[badgeKey] : 0;
            return (
              <button
                key={key}
                type="button"
                aria-label={label}
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate?.(key)}
                className={`relative flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition ${
                  active ? "bg-white text-flora-ink" : "text-white/70 hover:text-white"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {active && <span>{label}</span>}
                {badge > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
