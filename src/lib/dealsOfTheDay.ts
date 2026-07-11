// Deterministic daily pick so a "Deal of the Day" lineup is stable for 24h
// without needing a dedicated featured/discount flag on the product data
// model — the starting offset rotates by day, so the featured items change
// each day without repeats (as long as the pool has at least `count`
// products). Shared by Marketplace and the logged-in home page so both
// show the identical picks on a given day, rather than each computing its
// own selection over a possibly-different pool ordering.
export function pickDealsOfTheDay<T>(items: T[], count = 5): T[] {
  if (items.length === 0) return [];
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const n = Math.min(count, items.length);
  const start = dayIndex % items.length;
  return Array.from({ length: n }, (_, i) => items[(start + i) % items.length]);
}
