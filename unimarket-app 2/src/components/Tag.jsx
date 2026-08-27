export default function Tag({ children, variant = "solid", icon: Icon, className = "" }) {
  const variants = {
    solid: "bg-flora-tagBg text-flora-tagText",
    outline: "border border-flora-ink/15 bg-white/80 text-flora-ink",
    dark: "bg-flora-ink text-white",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${variants[variant]} ${className}`}
    >
      {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </span>
  );
}
