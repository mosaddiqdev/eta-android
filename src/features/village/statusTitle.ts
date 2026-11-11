import { formatAge } from "../../engine/time";

/**
 * The browser tab's title while a village is open: the time first, so it still shows when the tab is too narrow for
 * the rest. "2h 14m · Cannon". With nothing running it is the page's own title.
 */
export function statusTitle(next: { name: string; finishAt: number } | undefined, now: number, base: string) {
  if (!next) return base;
  const left = next.finishAt - now;
  return left > 0 ? `${left < 60 ? "<1m" : formatAge(left)} · ${next.name}` : `Done · ${next.name}`;
}
