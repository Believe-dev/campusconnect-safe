import { PlusIcon } from "@heroicons/react/24/solid";
import Tag from "./Tag";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export default function ProductCard({ product, onSelect }) {
  return (
    <article className="overflow-hidden rounded-3xl bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-floating">
      <button type="button" onClick={() => onSelect?.(product)} className="block w-full text-left">
        <div className="relative">
          <img
            src={product.image}
            alt={product.name}
            className="h-32 w-full object-cover sm:h-40"
          />
          <Tag variant="dark" className="absolute left-3 top-3 bg-flora-leaf text-white">
            {product.badge}
          </Tag>
        </div>

        <div className="p-4">
          <h3 className="truncate text-sm font-semibold text-flora-ink">{product.name}</h3>
          <p className="mt-0.5 truncate text-xs text-flora-muted">by {product.seller}</p>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-base font-semibold text-flora-ink">
              {currency.format(product.price)}
            </p>
            <span
              aria-label={`Add ${product.name} to cart`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-flora-leaf text-white"
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
