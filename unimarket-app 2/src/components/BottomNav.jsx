import {
  BuildingStorefrontIcon,
  HeartIcon,
  ShoppingCartIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

const NAV_ITEMS = [
  { key: "explore", label: "Shop", icon: BuildingStorefrontIcon },
  { key: "wishlist", label: "Wishlist", icon: HeartIcon },
  { key: "cart", label: "Cart", icon: ShoppingCartIcon },
  { key: "profile", label: "Profile", icon: UserIcon },
];

export default function BottomNav({ current = "explore", onNavigate }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 md:hidden"
    >
      <div className="flex items-center gap-2 rounded-full bg-flora-ink p-2 shadow-floating">
        {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
          const active = key === current;
          return (
            <button
              key={key}
              type="button"
              aria-label={label}
              aria-current={active ? "page" : undefined}
              onClick={() => onNavigate?.(key)}
              className={`flex items-center gap-2 rounded-full px-3 py-2.5 text-sm font-medium transition ${
                active ? "bg-white text-flora-ink" : "text-white/70 hover:text-white"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {active && <span>{label}</span>}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
