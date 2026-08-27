import { FunnelIcon, XMarkIcon } from "@heroicons/react/24/solid";

export default function FilterChip({
  label,
  active = false,
  removable = false,
  onRemove,
  className = "",
}) {
  if (active) {
    return (
      <button
        type="button"
        className={`inline-flex shrink-0 items-center gap-2 rounded-full bg-flora-ink px-4 py-2.5 text-sm font-medium text-white ${className}`}
      >
        <FunnelIcon className="h-4 w-4 text-flora-leafBright" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-flora-ink/10 bg-white/70 px-4 py-2.5 text-sm font-medium text-flora-ink ${className}`}
    >
      {label}
      {removable && (
        <button type="button" aria-label={`Remove ${label} filter`} onClick={onRemove}>
          <XMarkIcon className="h-3.5 w-3.5 text-flora-ink/60" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
