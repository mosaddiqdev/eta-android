import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, parseSettings } from "./settings";

describe("parseSettings", () => {
  it("gives the defaults for nothing, junk or the wrong type", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("dark")).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings(42)).toEqual(DEFAULT_SETTINGS);
  });

  it("repairs one bad field without losing the others", () => {
    expect(parseSettings({ theme: "neon", clock: "12", hideFinished: "yes" })).toEqual({
      theme: "auto",
      clock: "12",
      startOn: "auto",
      hideFinished: false,
      haptics: true,
    });
  });
});
