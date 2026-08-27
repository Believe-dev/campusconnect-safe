import { useEffect, useState } from "react";
import {
  HeartIcon,
  ArrowUpRightIcon,
  BuildingStorefrontIcon,
} from "@/components/ui/heroicons";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export interface DealOfTheDayProduct {
  id: string;
  title: string;
  price: number;
  images: string[];
  sellerName: string;
}

interface DealOfTheDayProps {
  products: DealOfTheDayProduct[];
  onSelect: (productId: string) => void;
  // Optional: read-only contexts (e.g. the home page teaser) don't wire up
  // favoriting — the heart button is simply omitted rather than rendered
  // as a dead control that does nothing when tapped.
  isFavorited?: (productId: string) => boolean;
  onToggleFavorite?: (productId: string) => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);

// How long each card stays on screen before the carousel flips to the next.
const ROTATE_MS = 6000;

interface DealCardProps {
  product: DealOfTheDayProduct;
  isFavorited: boolean;
  tilt: "left" | "right";
  onSelect: (productId: string) => void;
  onToggleFavorite?: (productId: string) => void;
}

// Matches the reference's Featured-deal article exactly: the badge+actions
// row is a sibling of the image/details button (not nested inside it, not
// floating over just the image) — normal flow above the button on mobile,
// an absolute overlay spanning the full card from sm: up. Same reason the
// image/details wrapper can be a real <button> again: since the icon
// buttons no longer live inside it, there's no nested-button problem.
const DealCard = ({ product, isFavorited, tilt, onSelect, onToggleFavorite }: DealCardProps) => (
  <article
    className={cn(
      "animate-deal-flip-in relative flex h-full flex-col overflow-hidden rounded-4xl bg-gradient-to-b from-[#bcd9a0] to-[#7fae63] p-4 shadow-floating [--tilt:0deg] sm:flex-row sm:items-stretch sm:gap-6 sm:p-6",
      tilt === "left" ? "sm:[--tilt:-1.5deg]" : "sm:[--tilt:1.5deg]",
    )}
  >
    <div className="flex items-center justify-between sm:absolute sm:left-6 sm:right-6 sm:top-6 sm:z-10">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-flora-ink/20 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm">
        <BuildingStorefrontIcon className="h-4 w-4" />
        Deal of the Day
      </span>
      <div className="flex items-center gap-2">
        {onToggleFavorite && (
          <IconButton
            icon={HeartIcon}
            label={
              isFavorited ? `Remove ${product.title} from favorites` : `Save ${product.title}`
            }
            size="sm"
            tone="ghost"
            pressed={isFavorited}
            iconClassName={isFavorited ? "fill-red-500 text-red-500" : undefined}
            onClick={() => onToggleFavorite(product.id)}
          />
        )}
        <IconButton
          icon={ArrowUpRightIcon}
          label={`View ${product.title} details`}
          size="sm"
          onClick={() => onSelect(product.id)}
        />
      </div>
    </div>

    {/* sm:mt-16 (not sm:mt-0) leaves the badge/icon row sitting on visible
        green above the white card, instead of overlapping its top edge —
        the two need daylight between them at this size to read as separate
        layers. */}
    <button
      type="button"
      onClick={() => onSelect(product.id)}
      className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.75rem] bg-flora-bgFrom/95 text-left shadow-card sm:mt-16 sm:flex-row"
    >
      {product.images?.[0] ? (
        <img
          src={product.images[0]}
          alt={`${product.title} by ${product.sellerName}`}
          className="h-56 w-full object-cover sm:h-auto sm:w-64"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
      ) : (
        <div className="h-56 w-full bg-flora-chip sm:h-auto sm:w-64" aria-hidden="true" />
      )}

      <div className="flex min-w-0 flex-1 flex-col justify-end p-5 sm:justify-center">
        {/* Title only shows in the large-screen two-card layout — on a
            single mobile card it's dropped to keep the card compact. */}
        <h2 className="hidden line-clamp-2 break-words text-2xl font-semibold text-flora-ink lg:block sm:text-3xl">
          {product.title}
        </h2>
        <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4 sm:flex-col sm:items-start sm:gap-1">
          <p className="truncate text-sm text-flora-muted">by {product.sellerName}</p>
          <p className="flex-shrink-0 text-xl font-semibold text-flora-ink sm:text-2xl">
            {formatPrice(product.price)}
          </p>
        </div>
      </div>
    </button>
  </article>
);

export const DealOfTheDay = ({
  products,
  isFavorited,
  onSelect,
  onToggleFavorite,
}: DealOfTheDayProps) => {
  const [index, setIndex] = useState(0);
  // Bumped alongside index so the flip-in animation replays every tick even
  // when the underlying product repeats (pools smaller than the window size).
  const [cycle, setCycle] = useState(0);
  const count = products.length;

  useEffect(() => {
    if (count <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % count);
      setCycle((c) => c + 1);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, [count]);

  if (count === 0) return null;

  const primary = products[index];
  const secondary = products[(index + 1) % count];

  return (
    <div className="mt-6 overflow-x-hidden py-2 [perspective:1600px]">
      <div className="flex items-stretch gap-6">
        <div className="min-w-0 flex-1">
          <DealCard
            key={`${primary.id}-${cycle}-a`}
            product={primary}
            isFavorited={isFavorited?.(primary.id) ?? false}
            tilt="left"
            onSelect={onSelect}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
        {count > 1 && (
          <div className="hidden min-w-0 flex-1 lg:block">
            <DealCard
              key={`${secondary.id}-${cycle}-b`}
              product={secondary}
              isFavorited={isFavorited?.(secondary.id) ?? false}
              tilt="right"
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DealOfTheDay;
