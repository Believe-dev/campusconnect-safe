import { ComponentType } from "react";
import { cn } from "@/lib/utils";

interface IconButtonProps {
  // Accepts lucide icons and the local heroicons.tsx components alike —
  // both are just `({ className }) => <svg .../>`.
  icon: ComponentType<{ className?: string }>;
  label: string;
  size?: "sm" | "md" | "lg";
  tone?: "light" | "dark" | "ghost";
  badge?: number | string | null;
  pressed?: boolean;
  iconClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

const SIZES: Record<NonNullable<IconButtonProps["size"]>, string> = {
  sm: "h-9 w-9",
  md: "h-11 w-11",
  lg: "h-12 w-12",
};

const TONES: Record<NonNullable<IconButtonProps["tone"]>, string> = {
  light: "bg-white text-flora-ink shadow-card",
  dark: "bg-flora-ink text-white shadow-card",
  ghost: "bg-white/70 text-flora-ink backdrop-blur-sm",
};

export const IconButton = ({
  icon: Icon,
  label,
  size = "md",
  tone = "light",
  badge,
  pressed,
  iconClassName,
  onClick,
  className,
}: IconButtonProps) => (
  <button
    type="button"
    aria-label={label}
    aria-pressed={pressed}
    onClick={onClick}
    className={cn(
      // Opts out of the site-wide 44px touch-target minimum (accessibility.css)
      // so `sm` (36px) actually renders at its intended compact size.
      "relative flex min-h-0 min-w-0 shrink-0 items-center justify-center rounded-full transition hover:brightness-105 active:scale-95",
      SIZES[size],
      TONES[tone],
      className
    )}
  >
    <Icon className={cn("h-5 w-5", iconClassName)} />
    {badge != null && (
      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
        {badge}
      </span>
    )}
  </button>
);

export default IconButton;
