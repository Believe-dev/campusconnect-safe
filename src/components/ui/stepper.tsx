import { PlusIconSolid, MinusIconSolid } from "@/components/ui/heroicons";

interface StepperProps {
  quantity: number;
  onIncrease: () => void;
  onDecrease: () => void;
  itemLabel: string;
}

export const Stepper = ({ quantity, onIncrease, onDecrease, itemLabel }: StepperProps) => (
  <div className="flex items-center gap-3">
    <button
      type="button"
      aria-label={`Increase quantity of ${itemLabel}`}
      onClick={onIncrease}
      className="flex h-8 w-8 min-h-0 min-w-0 items-center justify-center rounded-full bg-flora-chip text-flora-ink transition hover:bg-flora-tagBg"
    >
      <PlusIconSolid className="h-3.5 w-3.5" />
    </button>

    <span className="w-4 text-center text-sm font-medium text-flora-ink" aria-live="polite">
      {quantity}
    </span>

    <button
      type="button"
      aria-label={`Decrease quantity of ${itemLabel}`}
      onClick={onDecrease}
      className="flex h-8 w-8 min-h-0 min-w-0 items-center justify-center rounded-full bg-flora-chip text-flora-ink transition hover:bg-flora-tagBg"
    >
      <MinusIconSolid className="h-3.5 w-3.5" />
    </button>
  </div>
);

export default Stepper;
