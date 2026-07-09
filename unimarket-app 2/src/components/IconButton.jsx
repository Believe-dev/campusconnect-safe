export default function IconButton({
  icon: Icon,
  label,
  size = "md",
  tone = "light",
  badge,
  onClick,
  className = "",
}) {
  const sizes = {
    sm: "h-9 w-9",
    md: "h-11 w-11",
    lg: "h-12 w-12",
  };

  const tones = {
    light: "bg-white text-flora-ink shadow-card",
    dark: "bg-flora-ink text-white shadow-card",
    ghost: "bg-white/70 text-flora-ink backdrop-blur-sm",
  };

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`relative flex shrink-0 items-center justify-center rounded-full transition hover:brightness-105 active:scale-95 ${sizes[size]} ${tones[tone]} ${className}`}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      {badge != null && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
