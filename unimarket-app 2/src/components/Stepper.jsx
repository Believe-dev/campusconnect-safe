import { PlusIcon, MinusIcon } from "@heroicons/react/24/solid";

export default function Stepper({ quantity, onIncrease, onDecrease, itemLabel }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label={`Increase quantity of ${itemLabel}`}
        onClick={onIncrease}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-flora-chip text-flora-ink transition hover:bg-flora-tagBg"
      >
        <PlusIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <span className="w-4 text-center text-sm font-medium text-flora-ink" aria-live="polite">
        {quantity}
      </span>

      <button
        type="button"
        aria-label={`Decrease quantity of ${itemLabel}`}
        onClick={onDecrease}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-flora-chip text-flora-ink transition hover:bg-flora-tagBg"
      >
        <MinusIcon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
