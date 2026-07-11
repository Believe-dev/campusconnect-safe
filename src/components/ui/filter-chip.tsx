import { cn } from "@/lib/utils";

interface FilterChipProps {
  label: string;
  active?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

// Matches the design reference's FilterChip exactly, including its icons
// (heroicons solid Funnel/XMark) — copied as inline SVGs rather than adding
// @heroicons/react as a dependency for two icons already used nowhere else.
const FunnelIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.792 2.938A49.069 49.069 0 0 1 12 2.25c2.797 0 5.54.236 8.209.688a1.857 1.857 0 0 1 1.541 1.836v1.044a3 3 0 0 1-.879 2.121l-6.182 6.182a1.5 1.5 0 0 0-.439 1.061v2.927a3 3 0 0 1-1.658 2.684l-1.757.878A.75.75 0 0 1 9.75 21v-5.818a1.5 1.5 0 0 0-.44-1.06L3.13 7.938a3 3 0 0 1-.879-2.121V4.774c0-.897.64-1.683 1.542-1.836Z"
    />
  </svg>
);

const XMarkIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z"
    />
  </svg>
);

export const FilterChip = ({
  label,
  active = false,
  removable = false,
  onRemove,
  onClick,
  className,
}: FilterChipProps) => {
  if (active) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          // The site-wide 44px touch-target rule (accessibility.css) would
          // otherwise inflate this pill well past the reference's size —
          // opting out here since the chip's own tap area is still ample.
          "inline-flex min-h-0 min-w-0 shrink-0 items-center gap-2 rounded-full bg-flora-ink px-4 py-3.5 text-sm font-medium leading-none text-white",
          className,
        )}>
        <FunnelIcon className="h-4 w-4 flex-shrink-0 text-flora-leafBright" />
        {label}
      </button>
    );
  }

  if (removable) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-flora-ink/10 bg-white/70 px-4 py-2.5 text-sm font-medium leading-none text-flora-ink",
          className,
        )}>
        {label}
        <button
          type="button"
          aria-label={`Remove ${label} filter`}
          onClick={onRemove}
          className="inline-flex h-3.5 w-3.5 min-h-0 min-w-0 flex-shrink-0 items-center justify-center p-0">
          <XMarkIcon className="h-3.5 w-3.5 text-flora-ink/60" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-0 min-w-0 shrink-0 items-center gap-2 rounded-full border border-flora-ink/10 bg-white/70 px-4 py-2.5 text-sm font-medium leading-none text-flora-ink transition hover:bg-white",
        className,
      )}>
      {label}
    </button>
  );
};

export default FilterChip;
