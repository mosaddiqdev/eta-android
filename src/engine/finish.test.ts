import { describe, expect, it } from "vitest";
import { type BoostInput, fewestToFinish, forecast } from "./finish";
import { formatClock, formatDuration } from "./time";

const H = 3600;
const potion = (count: number, usedAgo = 0): BoostInput => ({
  bonus: 9,
  count,
  usedAgo,
});
const bite = (count: number): BoostInput => ({ bonus: 1, count, usedAgo: 0 });

describe("forecast", () => {
  it("runs at normal speed with no boost", () => {
    const result = forecast(30 * H, [potion(0)]);
    expect(result.finish).toBe(30 * H);
    expect(result.boostEnd).toBe(0);
    expect(result.saved).toBe(0);
  });

  it("saves bonus x duration when the upgrade outlasts the boost", () => {
    expect(forecast(30 * H, [potion(1)]).finish).toBe(21 * H);
    expect(forecast(30 * H, [potion(2)]).finish).toBe(12 * H);
  });

  it("adds different items together", () => {
    expect(forecast(30 * H, [potion(1), bite(1)]).finish).toBe(20 * H);
  });

  it("drops speed when the shorter boost ends first", () => {
    const result = forecast(30 * H, [potion(2), bite(1)]);
    expect(result.finish).toBe(11 * H);
    expect(result.segments.map((s) => s.speed)).toEqual([11, 10, 1]);
  });

  it("finishes inside the boost and reports the unused part", () => {
    const result = forecast(12 * H, [potion(2)]);
    expect(result.finish).toBe(72 * 60);
    expect(result.insideBoost).toBe(true);
    expect(result.unusedBoost).toBe(2 * H - 72 * 60);
  });

  it("rounds a fractional finish up to the next second", () => {
    const lab: BoostInput[] = [
      { bonus: 23, count: 1, usedAgo: 0 },
      { bonus: 3, count: 1, usedAgo: 0 },
    ];
    expect(forecast(10 * H, lab).finish).toBe(1334);
  });

  it("counts only the boost time still running", () => {
    expect(forecast(30 * H, [potion(1, 20 * 60)]).finish).toBe(24 * H);
  });

  it("ignores a boost that already ran out", () => {
    expect(forecast(30 * H, [potion(1, 2 * H)]).finish).toBe(30 * H);
  });

  it("returns an empty forecast for nothing left", () => {
    const result = forecast(0, [potion(1)]);
    expect(result.finish).toBe(0);
    expect(result.segments).toEqual([]);
  });
});

describe("fewestToFinish", () => {
  it("finds how many potions cover the whole upgrade", () => {
    expect(fewestToFinish(25 * H, [potion(2)], 0)).toBe(3);
    expect(fewestToFinish(5 * H, [potion(3)], 0)).toBe(1);
  });

  it("counts one boost while the other stays as the user set it", () => {
    // First hour runs at 11x (11h done), so a 12h upgrade has 1h left at 1x unless a second hour is boosted.
    expect(fewestToFinish(12 * H, [potion(0), bite(1)], 0)).toBe(2);
    expect(fewestToFinish(12 * H, [potion(1), bite(0)], 1)).toBe(2);
  });

  it("needs none of a boost when the others already cover it", () => {
    expect(fewestToFinish(3 * H, [potion(2), bite(1)], 1)).toBe(0);
  });

  it("gives up past 99", () => {
    expect(fewestToFinish(5000 * H, [potion(1)], 0)).toBeNull();
  });
});

describe("formatDuration", () => {
  it("keeps the two largest units", () => {
    expect(formatDuration(1334)).toBe("22m 14s");
    expect(formatDuration(72 * 60)).toBe("1h 12m");
    expect(formatDuration(21 * H)).toBe("21h");
    expect(formatDuration(27 * H + 65)).toBe("1d 3h");
  });
});

describe("formatClock", () => {
  it("keeps two units and the zeros, so a ticking timer never drops a unit or changes width", () => {
    expect(formatClock(2 * H)).toBe("02h 00m");
    expect(formatClock(2 * H - 1)).toBe("01h 59m");
    expect(formatClock(H + 60)).toBe("01h 01m");
    expect(formatClock(H)).toBe("01h 00m");
    expect(formatClock(H - 1)).toBe("59m 59s");
    expect(formatClock(45)).toBe("00m 45s");
    expect(formatClock(0)).toBe("00m 00s");
    expect(formatClock(-5)).toBe("00m 00s");
    expect(formatClock(24 * H)).toBe("01d 00h");
    expect(formatClock(24 * H - 1)).toBe("23h 59m");
    expect(formatClock(6 * 24 * H + 17 * H + 59)).toBe("06d 17h");
  });
});
