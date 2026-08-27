import Tag from "./Tag";
import Stepper from "./Stepper";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export default function CartItem({ item, onIncrease, onDecrease }) {
  return (
    <li className="flex items-center gap-4 border-b border-flora-ink/8 py-5 last:border-0">
      <img
        src={item.image}
        alt={item.name}
        className="h-16 w-16 shrink-0 rounded-2xl bg-flora-chip object-cover"
      />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base font-medium text-flora-ink">{item.name}</h3>
        <p className="truncate text-xs text-flora-muted">by {item.seller}</p>
        <Tag variant="outline" className="mt-1.5 px-3 py-1 text-xs">
          {item.condition}
        </Tag>
        <p className="mt-1.5 text-sm font-semibold text-flora-ink">
          {currency.format(item.price)}
        </p>
      </div>

      <Stepper
        quantity={item.quantity}
        itemLabel={item.name}
        onIncrease={() => onIncrease(item.id)}
        onDecrease={() => onDecrease(item.id)}
      />
    </li>
  );
}
