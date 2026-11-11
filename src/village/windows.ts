import type { Segment, Window } from "./types";

export interface Projection {
  /** Seconds from the export until the upgrade completes. */
  finish: number;
  segments: Segment[];
  /** Base seconds that the boosts removed. */
  saved: number;
}

/**
 * Walks forward from the export, one stretch of constant speed at a time, until the work is done.
 * Speed is 1 plus the bonus of every window that covers the stretch.
 */
export function project(remaining: number, windows: Window[]): Projection {
  if (remaining <= 0) return { finish: 0, segments: [], saved: 0 };

  const edges = [...new Set(windows.flatMap((w) => [w.start, w.end]).filter((t) => t > 0))].sort(
    (a, b) => a - b,
  );
  const segments: Segment[] = [];
  let clock = 0;
  let left = remaining;

  const push = (start: number, end: number, speed: number) => {
    const last = segments.at(-1);
    if (last && last.speed === speed && last.end === start) last.end = end;
    else segments.push({ start, end, speed });
  };

  for (const edge of edges) {
    const speed =
      1 + windows.filter((w) => w.start <= clock && w.end > clock).reduce((sum, w) => sum + w.bonus, 0);
    if (speed * (edge - clock) >= left) {
      const finish = clock + Math.ceil(left / speed);
      push(clock, finish, speed);
      return { finish, segments, saved: remaining - finish };
    }
    left -= speed * (edge - clock);
    push(clock, edge, speed);
    clock = edge;
  }

  // Past the last window everything runs at normal speed.
  const speed =
    1 + windows.filter((w) => w.start <= clock && w.end > clock).reduce((sum, w) => sum + w.bonus, 0);
  const finish = clock + Math.ceil(left / speed);
  push(clock, finish, speed);
  return { finish, segments, saved: remaining - finish };
}

/** Base-speed work still left `t` seconds after the export, given the projection of the same upgrade. */
export function remainingAt(projection: Projection, remaining: number, t: number): number {
  const done = projection.segments.reduce(
    (sum, s) => sum + Math.max(0, Math.min(s.end, t) - s.start) * s.speed,
    0,
  );
  return Math.max(0, remaining - done);
}
