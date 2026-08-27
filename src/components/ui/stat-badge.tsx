import { ComponentType } from "react";
import { cn } from "@/lib/utils";

interface StatBadgeProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  progress?: number;
  className?: string;
}

export const StatBadge = ({ icon: Icon, label, progress = 70, className }: StatBadgeProps) => {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress / 100);

  return (
    <div
      className={cn(
        "absolute flex w-24 flex-col items-center gap-2 rounded-[999px] bg-flora-ink/55 px-3 py-4 text-center text-white shadow-floating backdrop-blur-md",
        className
      )}
    >
      <div className="relative flex h-14 w-14 items-center justify-center">
        <svg viewBox="0 0 60 60" className="absolute inset-0 -rotate-90">
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="3"
          />
          <circle
            cx="30"
            cy="30"
            r={radius}
            fill="none"
            stroke="#8ed957"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={
              {
                "--ring-circumference": circumference,
                "--ring-offset": offset,
              } as React.CSSProperties
            }
            className="animate-ring-in"
          />
        </svg>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-xs font-medium leading-tight">{label}</p>
    </div>
  );
};

export default StatBadge;
