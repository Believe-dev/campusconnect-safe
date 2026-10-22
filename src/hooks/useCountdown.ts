import { useEffect, useState } from "react";

interface CountdownResult {
  msRemaining: number;
  isPast: boolean;
  formatted: string; // "HH:MM:SS" once under a day, else "Xd HH:MM:SS"
}

const pad = (n: number) => String(Math.max(0, n)).padStart(2, "0");

// Ticks every second against a fixed target - used for "opens in" / "ends
// in" displays on the Promos page and the entry modal. The in-dash grab
// timer is a separate, faster-ticking countdown built directly into
// PromoDash.tsx, since that one drives second-by-second UI at sub-second
// precision and is tightly coupled to the grab flow rather than a generic
// "time until a date" display.
export const useCountdown = (target: string | null | undefined): CountdownResult => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!target) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!target) {
    return { msRemaining: 0, isPast: true, formatted: "00:00:00" };
  }

  const msRemaining = new Date(target).getTime() - now;
  const isPast = msRemaining <= 0;
  const totalSeconds = Math.max(0, Math.floor(msRemaining / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = days > 0
    ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { msRemaining, isPast, formatted };
};
