import { describe, expect, it } from "vitest";
import type { Village } from "../notifications/compose";
import { chosenVillage, mainVillage } from "./chosen";

const village = (tag: string) => ({ account: { tag }, plan: {} }) as unknown as Village;
const villages = [village("#A"), village("#B"), village("#C")];

describe("chosenVillage", () => {
  it("prefers the main village", () => {
    expect(chosenVillage(villages, "#C", "#B")?.account.tag).toBe("#C");
  });
  it("falls back to the one opened last", () => {
    expect(chosenVillage(villages, "", "#B")?.account.tag).toBe("#B");
  });
  it("ignores a main village that was forgotten", () => {
    expect(chosenVillage(villages, "#Z", "#B")?.account.tag).toBe("#B");
    expect(mainVillage(villages, "#Z")).toBeUndefined();
  });
  it("falls back to the first when nothing says which, and to nothing when nothing is saved", () => {
    expect(chosenVillage(villages, "", null)?.account.tag).toBe("#A");
    expect(chosenVillage([], "", null)).toBeUndefined();
  });
});
