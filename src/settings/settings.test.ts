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
      ...DEFAULT_SETTINGS,
      clock: "12",
    });
  });

  it("keeps notifications off until they are turned on, and the two kinds on", () => {
    expect(DEFAULT_SETTINGS).toMatchObject({
      notify: false,
      notifyHelper: true,
      notifyTower: true,
      quietHours: false,
    });
    expect(parseSettings({ notify: "yes" }).notify).toBe(false);
    expect(parseSettings({ notify: true, notifyHelper: false }).notifyHelper).toBe(false);
  });

  it("only takes quiet hours that are a minute of the day", () => {
    expect(parseSettings({ quietFrom: 90, quietTo: 1439 })).toMatchObject({ quietFrom: 90, quietTo: 1439 });
    for (const bad of [-1, 1440, 7.5, "07:00", null])
      expect(parseSettings({ quietFrom: bad, quietTo: bad })).toMatchObject({
        quietFrom: DEFAULT_SETTINGS.quietFrom,
        quietTo: DEFAULT_SETTINGS.quietTo,
      });
  });
});
