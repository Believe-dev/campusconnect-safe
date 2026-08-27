import Tag from "./Tag";

const currency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export default function OrderSummary({ subtotal, onContinue, className = "" }) {
  return (
    <section
      aria-label="Order summary"
      className={`rounded-3xl bg-flora-chip p-5 sm:p-6 ${className}`}
    >
      <dl className="space-y-3">
        <div className="flex items-center justify-between text-sm text-flora-ink">
          <dt>Subtotal</dt>
          <dd className="font-medium">{currency.format(subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between text-sm text-flora-ink">
          <dt>Delivery</dt>
          <dd>
            <Tag variant="solid" className="px-3 py-1 text-xs">
              Calculated at checkout
            </Tag>
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-flora-ink/10 pt-3 text-base font-semibold text-flora-ink">
          <dt>Total</dt>
          <dd>{currency.format(subtotal)}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onContinue}
        className="mt-5 w-full rounded-full bg-flora-ink py-4 text-base font-medium text-white transition hover:brightness-110 active:scale-[0.99]"
      >
        Proceed to Checkout
      </button>
    </section>
  );
}
