import { describe, expect, it } from "vitest";
import type { Window } from "./types";
import { project, remainingAt } from "./windows";

const H = 3600;
const win = (start: number, end: number, bonus: number): Window => ({ start, end, bonus, source: "potion" });

// The obvious, slow way: tick one second at a time.
function brute(remaining: number, windows: Window[]) {
  let left = remaining;
  let t = 0;
  while (left > 0) {
    const speed = 1 + windows.filter((w) => w.start <= t && w.end > t).reduce((s, w) => s + w.bonus, 0);
    left -= speed;
    t++;
  }
  return t;
}

describe("project", () => {
  it("matches Finish time: 10h of work in a 10x hour finishes in 1h", () => {
    expect(project(10 * H, [win(0, H, 9)]).finish).toBe(H);
  });

  it("keeps going at 1x after the boost", () => {
    expect(project(20 * H, [win(0, H, 9)]).finish).toBe(H + 10 * H);
  });

  it("adds overlapping windows", () => {
    const result = project(100 * H, [win(0, 2 * H, 9), win(0, H, 1)]);
    expect(result.segments.map((s) => s.speed)).toEqual([11, 10, 1]);
    expect(result.saved).toBe(100 * H - result.finish);
  });

  it("starts a window later than now", () => {
    const result = project(30 * H, [win(5 * H, 6 * H, 9)]);
    expect(result.segments.map((s) => s.speed)).toEqual([1, 10, 1]);
    expect(result.finish).toBe(30 * H - 9 * H);
  });

  it("rounds a partial second up", () => {
    expect(project(10 * H, [win(0, H, 23), win(0, H, 3)]).finish).toBe(Math.ceil((10 * H) / 27));
  });

  it("agrees with a second-by-second simulation on random cases", () => {
    let seed = 7;
    const random = (max: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % max;
    };
    for (let n = 0; n < 40; n++) {
      const windows = Array.from({ length: 1 + random(4) }, () => {
        const start = random(600);
        return win(start, start + 1 + random(900), 1 + random(25));
      });
      const remaining = 1 + random(20000);
      expect(project(remaining, windows).finish).toBe(brute(remaining, windows));
    }
  });
});

describe("remainingAt", () => {
  const windows = [win(0, H, 9)];
  const projection = project(30 * H, windows);

  it("drops ten times as fast during the boost", () => {
    expect(remainingAt(projection, 30 * H, H / 2)).toBe(30 * H - 5 * H);
    expect(remainingAt(projection, 30 * H, H)).toBe(20 * H);
  });

  it("drops at normal speed afterwards and reaches zero at the finish", () => {
    expect(remainingAt(projection, 30 * H, 3 * H)).toBe(18 * H);
    expect(remainingAt(projection, 30 * H, projection.finish)).toBe(0);
    expect(remainingAt(projection, 30 * H, projection.finish + 999)).toBe(0);
  });
});
