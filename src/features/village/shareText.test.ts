import { describe, expect, it } from "vitest";
import type { PlannedUpgrade } from "../../village/plan";
import { shareText } from "./shareText";

const NOW = 1_700_000_000;
const up = (over: Partial<PlannedUpgrade>) =>
  ({
    name: "Cannon",
    lane: "builder",
    fromLevel: 13,
    toLevel: 14,
    finishAt: NOW + 3600,
    likelyDone: false,
    ...over,
  }) as PlannedUpgrade;

describe("shareText", () => {
  it("lists a running upgrade with its levels and how long is left", () => {
    const text = shareText([up({})], NOW);
    expect(text).toContain("Cannon (Lv 13 to 14): 1h 0m");
  });

  it("puts the soonest first within a lane", () => {
    const text = shareText([up({ name: "Later", finishAt: NOW + 7200 }), up({ name: "Sooner" })], NOW);
    expect(text.indexOf("Sooner")).toBeLessThan(text.indexOf("Later"));
  });

  it("leaves out anything that is done", () => {
    const text = shareText([up({ name: "Done", likelyDone: true }), up({ name: "Running" })], NOW);
    expect(text).not.toContain("Done");
    expect(text).toContain("Running");
  });

  it("caps a long list and says how many more there are", () => {
    const many = Array.from({ length: 30 }, (_, i) => up({ name: `Item${i}`, finishAt: NOW + 60 * (i + 1) }));
    expect(shareText(many, NOW)).toContain("…and 6 more");
  });
});
