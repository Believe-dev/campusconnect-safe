import { ComponentType } from "react";
import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  variant?: "solid" | "outline" | "dark";
  // Accepts lucide icons and the local heroicons.tsx components alike —
  // both are just `({ className }) => <svg .../>`.
  icon?: ComponentType<{ className?: string }>;
  className?: string;
}

const TAG_VARIANTS: Record<NonNullable<TagProps["variant"]>, string> = {
  solid: "bg-flora-tagBg text-flora-tagText",
  outline: "border border-flora-ink/15 bg-white/80 text-flora-ink",
  dark: "bg-flora-ink text-white",
};

export const Tag = ({ children, variant = "solid", icon: Icon, className }: TagProps) => (
  <span
    className={cn(
      "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium",
      TAG_VARIANTS[variant],
      className
    )}
  >
    {Icon && <Icon className="h-4 w-4" />}
    {children}
  </span>
);

export default Tag;
