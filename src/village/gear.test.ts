import { describe, expect, it } from "vitest";
import { isGearUpInProgress } from "./gear";

const DAY = 86400;

// Mortar numbers: gear up takes 14 days; levelling takes 3 days from level 14.
describe("isGearUpInProgress", () => {
  it("is a level upgrade when the timer fits both (the common case)", () => {
    expect(isGearUpInProgress(2.77 * DAY, 3 * DAY, 14 * DAY)).toBe(false);
  });

  it("is the gear up when the timer is longer than the level upgrade could be", () => {
    expect(isGearUpInProgress(10 * DAY, 3 * DAY, 14 * DAY)).toBe(true);
  });

  it("is a level upgrade when the timer is longer than the gear up takes", () => {
    expect(isGearUpInProgress(5 * DAY, 20 * DAY, 2 * DAY)).toBe(false);
  });

  it("is the gear up at the top level, where there is no level to upgrade to", () => {
    expect(isGearUpInProgress(DAY, undefined, 2 * DAY)).toBe(true);
  });

  it("is a level upgrade when the building can't be geared up at all", () => {
    expect(isGearUpInProgress(DAY, 3 * DAY, undefined)).toBe(false);
  });

  it("is a level upgrade when the timer fits neither, such as after a balance change", () => {
    expect(isGearUpInProgress(30 * DAY, 3 * DAY, 14 * DAY)).toBe(false);
  });
});
