import { describe, expect, it } from "vitest";
import { isCooledDown, isNewer } from "./check-data-version.mjs";
import { diffCatalogs } from "./data-diff.mjs";

const entry = (name, levels, image = "x/y") => ({ name, kind: "building", village: "home", image, levels });

describe("isNewer", () => {
  it("compares numerically, not as text", () => {
    expect(isNewer("0.20.0", "0.19.0")).toBe(true);
    expect(isNewer("0.100.0", "0.19.0")).toBe(true);
    expect(isNewer("1.0.0", "0.99.9")).toBe(true);
    expect(isNewer("0.19.0", "0.19.0")).toBe(false);
    expect(isNewer("0.18.1", "0.19.0")).toBe(false);
  });
});

describe("isCooledDown", () => {
  const now = new Date("2026-11-10T12:00:00Z");

  it("holds a version back until it has been out for the cooldown", () => {
    expect(isCooledDown("2026-11-09T12:00:00Z", now)).toBe(false);
    expect(isCooledDown("2026-11-07T12:00:01Z", now)).toBe(false);
    expect(isCooledDown("2026-11-07T12:00:00Z", now)).toBe(true);
    expect(isCooledDown("2026-10-01T00:00:00Z", now)).toBe(true);
  });

  it("never holds a version back for want of a date", () => {
    expect(isCooledDown(null, now)).toBe(true);
    expect(isCooledDown("not a date", now)).toBe(true);
  });
});

describe("diffCatalogs", () => {
  const before = { entries: { 1: entry("Cannon", [0, 10, 20]), 2: entry("Gone", [0]) } };
  const after = {
    entries: {
      1: entry("Cannon", [0, 10, 20, 30]),
      3: entry("Brand New", [0, 5], null),
    },
  };
  const diff = diffCatalogs(before, after);

  it("finds added, removed and extended items", () => {
    expect(diff.added).toEqual(["Brand New (building, home, 2 levels)"]);
    expect(diff.removed).toEqual(["Gone (building, home)"]);
    expect(diff.moreLevels).toEqual(["Cannon: 3 → 4 levels"]);
  });

  it("finds retimed items only among levels both versions have", () => {
    expect(diff.timesChanged).toEqual([]);
    const retimed = diffCatalogs(before, { entries: { 1: entry("Cannon", [0, 9, 20]) } });
    expect(retimed.timesChanged).toEqual(["Cannon"]);
  });

  it("lists items without a picture and marks the new ones", () => {
    expect(diff.noPicture).toEqual(["Brand New (new)"]);
  });
});
