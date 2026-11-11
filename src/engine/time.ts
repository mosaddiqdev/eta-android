export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function toSeconds({ days, hours, minutes, seconds }: Duration) {
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

/** The two largest non-zero units, the way the game's own timers read: "1h 12m". */
export function formatDuration(total: number) {
  if (total <= 0) return "0s";
  const parts: [number, string][] = [
    [Math.floor(total / 86400), "d"],
    [Math.floor((total % 86400) / 3600), "h"],
    [Math.floor((total % 3600) / 60), "m"],
    [total % 60, "s"],
  ];
  return parts
    .filter(([amount]) => amount > 0)
    .slice(0, 2)
    .map(([amount, unit]) => `${amount}${unit}`)
    .join(" ");
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A running timer, always two units and always the same shape, so it does not change width or lose a unit as it
 * ticks: "06d 17h", "02h 00m", "01h 59m", "00m 45s". The game's own timers drop a unit that is zero ("2h"), which
 * makes a countdown read "2h" for a second and then "1h 59m"; here the zero stays. Use `formatDuration` for a fixed
 * length that is not counting ("5x for 1h").
 */
export function formatClock(total: number) {
  const left = Math.max(0, Math.floor(total));
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  if (d > 0) return `${pad(d)}d ${pad(h)}h`;
  if (h > 0) return `${pad(h)}h ${pad(m)}m`;
  return `${pad(m)}m ${pad(s)}s`;
}

/**
 * How long ago something was, in prose: "4m", "2h 0m", "1d 0h". Two units from an hour up and the zero kept, for the
 * same reason as `formatClock`, but not padded, because it sits in a sentence ("2h 0m ago") and not in a timer.
 */
export function formatAge(total: number) {
  const left = Math.max(0, Math.floor(total));
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  const m = Math.floor((left % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** "just now" for the first minute and a half, then "5m ago", "2h 0m ago". For prose, so it is not padded. */
export function formatAgo(total: number) {
  return total < 90 ? "just now" : `${formatAge(total)} ago`;
}
