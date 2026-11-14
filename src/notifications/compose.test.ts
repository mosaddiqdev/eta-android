import { describe, expect, it } from "vitest";
import { snapshotCatalog } from "../test/catalog";
import one from "../village/fixtures/account-1.json";
import two from "../village/fixtures/account-2.json";
import { parseExport } from "../village/parse";
import { buildPlan } from "../village/plan";
import { emptyScenario } from "../village/scenario";
import { type Alert, alertId, composeAlerts, isQuiet, type Village, type Wanted } from "./compose";

const all: Wanted = { helper: true, tower: true, quiet: null };

function village(data: unknown): Village {
  const { account, warnings } = parseExport(data, snapshotCatalog);
  return { account, plan: buildPlan(account, warnings, emptyScenario(account.exportedAt)) };
}

const first = village(one);
const alertsOf = (v: Village, wanted = all) => composeAlerts([v], wanted, v.account.exportedAt * 1000);

describe("isQuiet", () => {
  const at = (h: number, m = 0) => new Date(2026, 10, 14, h, m).getTime();
  it("covers a window inside one day", () => {
    const day = { from: 9 * 60, to: 17 * 60 };
    expect(isQuiet(at(9), day)).toBe(true);
    expect(isQuiet(at(16, 59), day)).toBe(true);
    expect(isQuiet(at(17), day)).toBe(false);
  });

  it("covers a window that runs past midnight", () => {
    const night = { from: 22 * 60, to: 7 * 60 };
    expect(isQuiet(at(23), night)).toBe(true);
    expect(isQuiet(at(3), night)).toBe(true);
    expect(isQuiet(at(7), night)).toBe(false);
    expect(isQuiet(at(12), night)).toBe(false);
  });

  it("is never quiet when the two times are the same", () => {
    expect(isQuiet(at(3), { from: 60, to: 60 })).toBe(false);
  });
});

describe("alertId", () => {
  it("is the same for the same text, differs for another, and fits a Java int", () => {
    expect(alertId("#A|finish|x|1")).toBe(alertId("#A|finish|x|1"));
    expect(alertId("#A|finish|x|1")).not.toBe(alertId("#A|finish|x|2"));
    for (const text of ["a", "#VILLAGE|helperReady|builder|1800000000"])
      expect(alertId(text)).toBeLessThanOrEqual(2 ** 31 - 1);
  });
});

describe("composeAlerts", () => {
  const alerts = alertsOf(first);

  it("has one for every upgrade that finishes later, soonest first", () => {
    expect(alerts.filter((a) => a.channel === "upgrades")).toHaveLength(first.plan.upgrades.length);
    expect(alerts.map((a) => a.at)).toEqual([...alerts.map((a) => a.at)].sort((a, b) => a - b));
  });

  it("keeps the words short enough for a phone to show whole", () => {
    for (const a of alerts) {
      expect(a.title.length).toBeGreaterThan(0);
      expect(a.title.length).toBeLessThanOrEqual(65);
      expect(a.body.length).toBeLessThanOrEqual(240);
    }
  });

  it("gives every alert its own id", () => {
    expect(new Set(alerts.map((a) => a.id)).size).toBe(alerts.length);
  });

  it("points each picture into the app's own game pictures", () => {
    const pictured = alerts.filter((a) => a.image);
    expect(pictured.length).toBeGreaterThan(0);
    for (const a of pictured) expect(a.image).toMatch(/^public\/game\/.+\.webp$/);
  });

  it("says what finished and what is free, in the game's words", () => {
    const up = alerts.find((a) => a.channel === "upgrades") as Alert;
    expect(up.title).toMatch(/ is (now level \d+|built|geared up|done)$/);
    expect(up.body).toMatch(/is free\./);
  });

  it("leaves out the helper and the tower when they are turned off", () => {
    const quiet = alertsOf(first, { helper: false, tower: false, quiet: null });
    expect(quiet.every((a) => a.channel === "upgrades")).toBe(true);
  });

  it("skips what is already over", () => {
    const late = composeAlerts([first], all, (first.account.exportedAt + 10 * 365 * 86400) * 1000);
    expect(late).toEqual([]);
  });

  it("names the village once there is more than one", () => {
    const other = village(two);
    const both = composeAlerts([first, other], all, first.account.exportedAt * 1000);
    expect(both.some((a) => a.body.includes(first.account.tag))).toBe(true);
    expect(alerts.every((a) => !a.body.includes(first.account.tag))).toBe(true);
  });

  it("marks what lands inside quiet hours as silent", () => {
    const everything = { from: 0, to: 1 };
    const none = alertsOf(first, { ...all, quiet: { from: 5, to: 5 } });
    expect(none.every((a) => !a.silent)).toBe(true);
    const some = alertsOf(first, { ...all, quiet: everything });
    expect(some.every((a) => a.silent === isQuiet(a.at, everything))).toBe(true);
  });
});
