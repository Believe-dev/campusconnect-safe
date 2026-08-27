import { ShoppingCart, Check, Package } from "lucide-react";

export interface ProductCardProduct {
  id: string;
  title: string;
  price: number;
  stock_quantity: number;
  images: string[];
  sellerName: string;
}

interface ProductCardProps {
  product: ProductCardProduct;
  isInCart: boolean;
  onSelect: (productId: string) => void;
  onToggleCart: (productId: string) => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(price);

const CARD_BG = "#ffffff";
const CART_GREEN = "#5f9a3f"; // matches the flora-leaf design token

// Button/margin size is driven by CSS custom properties (--btn-w/--btn-h/
// --gap, set responsively via the wrapper's className below) rather than
// fixed JS constants, so the button shrinks along with the card on small
// screens without needing a resize listener. Mobile button bumped up to
// 42px (from an earlier 36px) — a deliberately bigger jump so the size
// change actually reads at a glance. NOTCH_CORNER_RADIUS is a plain number
// since 16px comfortably fits inside the notch at both sizes.
// The button sits flush with the card's own right/bottom edges (same
// "line" as the card) — the gap only shows on the top and left, where the
// card's material recedes into the notch around it.
const NOTCH_CORNER_RADIUS = 16;

const ProductCard = ({
  product,
  isInCart,
  onSelect,
  onToggleCart,
}: ProductCardProps) => {
  const outOfStock = product.stock_quantity === 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(product.id);
    }
  };

  return (
    <div className="relative [--btn-w:42px] [--btn-h:42px] [--gap:5px] [--notch-w:calc(var(--btn-w)+var(--gap))] [--notch-h:calc(var(--btn-h)+var(--gap))] sm:[--btn-w:104px] sm:[--btn-h:44px] sm:[--gap:6px]">
      {/* The card's white background, built from two plain rectangles
          instead of one — their union covers the whole card except a
          rectangular notch at the bottom-right (sized for the button).
          Plain border-radius on ordinary CSS rects, so there's no path/arc
          math and nothing that can silently fail to render. Each rect's
          own bottom-right corner happens to land exactly where the notch
          meets the card's outer edge, so rounding it is a single extra
          border-radius rather than anything bespoke. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 rounded-t-[28px] shadow-card"
        style={{
          height: "calc(100% - var(--notch-h))",
          borderBottomRightRadius: NOTCH_CORNER_RADIUS,
          background: CARD_BG,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 rounded-tl-[28px] rounded-bl-[28px] shadow-card"
        style={{
          width: "calc(100% - var(--notch-w))",
          borderBottomRightRadius: NOTCH_CORNER_RADIUS,
          background: CARD_BG,
        }}
      />
      {/* The notch's third (inner, concave) corner — where those two rects'
          edges meet — can't be rounded with a plain border-radius since
          it's concave, not a real corner of either rect. A small white
          square sits exactly there, masked with a radial-gradient circle
          centered on its far corner (away from the meeting point): that
          eats everything except a thin sliver nearest the meeting point,
          which is what reads as the card material curving smoothly around
          it instead of stepping in at a hard right angle. */}
      <div
        aria-hidden="true"
        className="absolute"
        style={{
          right: `calc(var(--notch-w) - ${NOTCH_CORNER_RADIUS}px)`,
          bottom: `calc(var(--notch-h) - ${NOTCH_CORNER_RADIUS}px)`,
          width: NOTCH_CORNER_RADIUS,
          height: NOTCH_CORNER_RADIUS,
          background: CARD_BG,
          maskImage: `radial-gradient(circle ${NOTCH_CORNER_RADIUS}px at 100% 100%, transparent ${NOTCH_CORNER_RADIUS - 1}px, black ${NOTCH_CORNER_RADIUS}px)`,
          WebkitMaskImage: `radial-gradient(circle ${NOTCH_CORNER_RADIUS}px at 100% 100%, transparent ${NOTCH_CORNER_RADIUS - 1}px, black ${NOTCH_CORNER_RADIUS}px)`,
        }}
      />

      {/* A native <button> can't wrap the add-to-cart <button> below
          (invalid HTML), so this outer clickable region is a div with
          button semantics instead. No background of its own — the two
          rects above show through everywhere except the notch. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(product.id)}
        onKeyDown={handleKeyDown}
        className="relative block w-full cursor-pointer text-left">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.title}
            className="h-32 w-full rounded-t-[28px] object-cover sm:h-44"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg";
            }}
          />
        ) : (
          <div
            className="flex h-32 w-full items-center justify-center rounded-t-[28px] bg-muted sm:h-44"
            aria-hidden="true">
            <Package className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}

        {/* Bottom padding keeps title/seller/price clear of the notch's
            vertical band entirely, so long titles can never run into the
            button regardless of how far right they truncate. */}
        <div
          className="px-5 pt-3.5"
          style={{ paddingBottom: "calc(var(--notch-h) + 2px)" }}>
          <h3 className="truncate text-base font-bold text-foreground">
            {product.title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            by {product.sellerName}
          </p>
          <p className="mt-1.5 text-lg font-bold text-foreground">
            {formatPrice(product.price)}
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={outOfStock}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCart(product.id);
        }}
        aria-label={
          outOfStock
            ? `${product.title} is out of stock`
            : isInCart
              ? `Remove ${product.title} from cart`
              : `Add ${product.title} to cart`
        }
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: "var(--btn-w)",
          height: "var(--btn-h)",
          borderRadius: "calc(var(--btn-h) / 2)",
          background: CART_GREEN,
        }}
        // Opts out of the site-wide 44px touch-target minimum
        // (accessibility.css) — this button's size is deliberately smaller
        // to fit the notch; the 44px rule would override that.
        className="flex min-h-0 min-w-0 items-center justify-center gap-1.5 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
        {isInCart ? (
          <>
            <span className="hidden sm:inline">Added</span>
            <Check className="h-5 w-5 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Cart</span>
            <ShoppingCart
              className="h-5 w-5 sm:h-3.5 sm:w-3.5"
              aria-hidden="true"
            />
          </>
        )}
      </button>
    </div>
  );
};

export default ProductCard;
