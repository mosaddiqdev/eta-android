import { describe, expect, it } from "vitest";
import { snapshotCatalog } from "../test/catalog";
import two from "./fixtures/account-2.json";
import { parseExport } from "./parse";
import { buildPlan } from "./plan";
import { clockTowerOutlook } from "./potion";
import { windowsFor } from "./rates";
import { emptyScenario } from "./scenario";

const H = 3600;

type Export = Record<string, unknown[]> & { boosts: Record<string, number> };

// A Builder Base with a level 10 Clock Tower (32 minutes at 10x), one Master Builder upgrade and one Star
// Laboratory upgrade to speed up, and exactly the boosts a test gives it.
function withTower(boosts: Record<string, number>, tower = true) {
  const data = structuredClone(two) as unknown as Export;
  data.buildings2 = [
    ...(tower ? [{ data: 1000039, lvl: 10, cnt: 1 }] : []),
    { data: 1000050, lvl: 5, timer: 40 * H },
  ];
  data.units2 = [{ data: 4000037, lvl: 11, timer: 30 * H }];
  data.boosts = { ...boosts };
  return parseExport(data, snapshotCatalog);
}

describe("Clock Tower", () => {
  it("reads the level and what a boost gives from the game data", () => {
    const { account } = withTower({ clocktower_cooldown: 20 * H });
    expect(account.clockTower).toMatchObject({ level: 10, bonus: 9, seconds: 32 * 60 });
  });

  it("speeds up both the Master Builder and the Star Laboratory once planned, but not before the cooldown ends", () => {
    const { account } = withTower({ clocktower_cooldown: 20 * H });
    const scenario = { ...emptyScenario(account.exportedAt), clockTower: { at: account.exportedAt } };
    for (const lane of ["bbBuilder", "bbLab"] as const) {
      const upgrade = account.upgrades.find((u) => u.lane === lane);
      if (!upgrade) throw new Error("fixture changed");
      const windows = windowsFor(upgrade, account, scenario).filter((w) => w.source === "clockTower");
      expect(windows).toEqual([{ start: 20 * H, end: 20 * H + 32 * 60, bonus: 9, source: "clockTower" }]);
      expect(windowsFor(upgrade, account, emptyScenario(account.exportedAt))).toEqual([]);
    }
  });

  it("waits for a running boost to end before the next one", () => {
    const { account } = withTower({ clocktower_boost: 600, clocktower_cooldown: 100 });
    const scenario = { ...emptyScenario(account.exportedAt), clockTower: { at: account.exportedAt } };
    const upgrade = account.upgrades.find((u) => u.lane === "bbBuilder");
    if (!upgrade) throw new Error("fixture changed");
    const windows = windowsFor(upgrade, account, scenario);
    expect(windows.map((w) => [w.start, w.end])).toEqual([
      [0, 600],
      [600, 600 + 32 * 60],
    ]);
  });

  it("saves 9 extra minutes of work for every minute it runs", () => {
    const { account } = withTower({ clocktower_cooldown: 20 * H });
    const { saved, helped, readyAt } = clockTowerOutlook(account, account.exportedAt);
    expect(readyAt).toBe(account.exportedAt + 20 * H);
    expect(helped).toBe(2);
    // The boost adds 9 x 1920 s of work to each upgrade and nothing else speeds them up afterwards.
    expect(saved).toBe(2 * 9 * 1920);
  });

  it("adds a 'ready again' moment to the schedule", () => {
    const { account, warnings } = withTower({ clocktower_cooldown: 20 * H });
    const plan = buildPlan(account, warnings, emptyScenario(account.exportedAt));
    const ready = plan.events.find((e) => e.kind === "towerReady");
    expect(ready).toMatchObject({ at: account.exportedAt + 20 * H, label: "Clock Tower" });
  });
});
