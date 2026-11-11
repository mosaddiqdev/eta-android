import { HOUR } from "./items";

export interface BoostInput {
  bonus: number;
  count: number;
  /** Seconds since the boost was used. */
  usedAgo: number;
}

export interface Segment {
  start: number;
  end: number;
  speed: number;
}

export interface Forecast {
  segments: Segment[];
  /** Real seconds from now until the upgrade completes. */
  finish: number;
  saved: number;
  /** True when the upgrade completes before every boost has run out. */
  insideBoost: boolean;
  /** Upgrade time (at 1x) still left when the last boost ends. 0 if insideBoost. */
  leftAfterBoost: number;
  /** Real seconds of boost that were still running when the upgrade completed. */
  unusedBoost: number;
  /** Real seconds until the last boost ends; 0 when nothing is active. */
  boostEnd: number;
}

const MAX_POTIONS = 99;

// Duration stacks, effect doesn't: n uses means n hours at one bonus.
function secondsLeft({ count, usedAgo }: BoostInput) {
  return Math.max(0, count * HOUR - usedAgo);
}

export function forecast(remaining: number, boosts: BoostInput[]): Forecast {
  const active = boosts
    .map((boost) => ({ bonus: boost.bonus, left: secondsLeft(boost) }))
    .filter((boost) => boost.left > 0);
  const ends = [...new Set(active.map((boost) => boost.left))].sort((a, b) => a - b);
  const boostEnd = ends.at(-1) ?? 0;

  const segments: Segment[] = [];
  let clock = 0;
  let left = remaining;

  for (const end of ends) {
    const bonus = active.filter((boost) => boost.left > clock).reduce((sum, boost) => sum + boost.bonus, 0);
    const speed = 1 + bonus;

    if (speed * (end - clock) >= left) {
      const finish = clock + Math.ceil(left / speed);
      if (finish > clock) segments.push({ start: clock, end: finish, speed });
      return {
        segments,
        finish,
        saved: remaining - finish,
        insideBoost: true,
        leftAfterBoost: 0,
        unusedBoost: boostEnd - finish,
        boostEnd,
      };
    }

    left -= speed * (end - clock);
    segments.push({ start: clock, end, speed });
    clock = end;
  }

  if (left > 0) segments.push({ start: clock, end: clock + left, speed: 1 });

  const finish = clock + left;
  return {
    segments,
    finish,
    saved: remaining - finish,
    insideBoost: false,
    leftAfterBoost: left,
    unusedBoost: 0,
    boostEnd,
  };
}

/** Smallest count of boosts[index] that lets the upgrade finish inside the boost, or null if 99 isn't enough. */
export function fewestToFinish(remaining: number, boosts: BoostInput[], index: number): number | null {
  for (let count = 0; count <= MAX_POTIONS; count++) {
    const trial = boosts.map((boost, i) => (i === index ? { ...boost, count } : boost));
    const result = forecast(remaining, trial);
    if (result.boostEnd > 0 && result.insideBoost) return count;
  }
  return null;
}
