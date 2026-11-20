import { describe, expect, it } from "vitest";
import { snapshotCatalog } from "../test/catalog";
import one from "./fixtures/account-1.json";
import two from "./fixtures/account-2.json";
import { parseExport } from "./parse";
import { buildPlan, laneLoad } from "./plan";
import { windowsFor } from "./rates";
import { emptyScenario } from "./scenario";
import type { Window } from "./types";
import { project } from "./windows";

const H = 3600;
const load = (data: unknown) => parseExport(data, snapshotCatalog);
const a1 = load(one);
const a2 = load(two);

describe("helper and potion windows on real data", () => {
  it("stacks the active potion and the active Builder's Apprentice on the Monolith", () => {
    const monolith = a2.account.upgrades.find((u) => u.name === "Monolith");
    if (!monolith) throw new Error("fixture changed");
    const windows = windowsFor(monolith, a2.account, emptyScenario(a2.account.exportedAt));
    // 18x while both run (1 + 9 + 8), then 10x until the potion ends, then 1x.
    const expected = 18 * 3473 + 10 * (3575 - 3473);
    const finish = 3575 + (monolith.remaining - expected);
    expect(project(monolith.remaining, windows).finish).toBe(finish);
    expect(finish).toBe(716258);
  });

  it("repeats a recurrent helper every 23 hours after the cooldown", () => {
    const mortar = a1.account.upgrades.find((u) => u.helper?.recurrent && u.lane === "builder");
    if (!mortar) throw new Error("fixture changed");
    const helper = windowsFor(mortar, a1.account, emptyScenario(a1.account.exportedAt)).filter(
      (w) => w.source === "helper",
    );
    expect(helper.map((w) => w.start)).toEqual([65562, 65562 + 23 * H]);
    expect(helper.every((w) => w.bonus === 8 && w.end - w.start === H)).toBe(true);
  });

  it("matches a hand-built timeline for the recurrent Lab Assistant", () => {
    const dragon = a2.account.upgrades.find((u) => u.name === "Electro Dragon");
    if (!dragon) throw new Error("fixture changed");
    const expected: Window[] = [
      { start: 0, end: 3580, bonus: 23, source: "potion" },
      { start: 0, end: 3514, bonus: 4, source: "helper" },
    ];
    for (let start = 82673; start < dragon.remaining; start += 23 * H) {
      expected.push({ start, end: start + H, bonus: 4, source: "helper" });
    }
    const real = windowsFor(dragon, a2.account, emptyScenario(a2.account.exportedAt));
    expect(project(dragon.remaining, real).finish).toBe(project(dragon.remaining, expected).finish);
    expect(project(dragon.remaining, real).finish).toBeLessThan(dragon.remaining - 100_000);
  });

  it("extends a running potion instead of making it stronger", () => {
    const upgrade = a2.account.upgrades.find((u) => u.name === "Monolith");
    if (!upgrade) throw new Error("fixture changed");
    const at = a2.account.exportedAt;
    const windows = windowsFor(upgrade, a2.account, {
      ...emptyScenario(at),
      potions: [{ source: "potion", lane: "builder", count: 1, at: at + 1000 }],
    });
    const potion = windows.filter((w) => w.source === "potion");
    expect(potion).toEqual([{ start: 0, end: 3575 + H, bonus: 9, source: "potion" }]);
  });

  it("uses Study Soup for pets too, but not Research Potions", () => {
    const owl = a2.account.upgrades.find((u) => u.name === "Electro Owl");
    if (!owl) throw new Error("fixture changed");
    const at = a2.account.exportedAt;
    const windows = windowsFor(owl, a2.account, {
      ...emptyScenario(at),
      potions: [
        { source: "snack", lane: "lab", count: 1, at },
        { source: "potion", lane: "lab", count: 1, at },
      ],
    });
    expect(windows.map((w) => `${w.source}:${w.bonus}`).sort()).toEqual(["potion:23", "snack:3"]);
    // The 23 is the existing Pet Potion, not the Research Potion that was added.
    expect(windows.find((w) => w.source === "potion")?.end).toBe(3572);
  });
});

describe("buildPlan", () => {
  const { account } = a2;
  const now = account.exportedAt + 600;
  const plan = buildPlan(account, a2.warnings, emptyScenario(now));

  it("summarises the lanes", () => {
    const builder = plan.lanes.find((l) => l.lane === "builder");
    expect(builder).toMatchObject({ capacity: 6, busy: 6, idle: 0, goblinBusy: 0 });
    expect(plan.lanes.find((l) => l.lane === "lab")).toMatchObject({ busy: 1, idle: 0 });
    expect(plan.lanes.find((l) => l.lane === "bbBuilder")?.idle).toBeNull();
  });

  it("flags an old export", () => {
    const old = buildPlan(account, [], emptyScenario(account.exportedAt + 5 * H));
    expect(old.insights.some((i) => i.code === "old-export")).toBe(true);
    expect(plan.insights.some((i) => i.code === "old-export")).toBe(false);
  });

  it("marks upgrades that should have finished since the export", () => {
    const soon = { ...account, upgrades: [{ ...account.upgrades[0], remaining: 100 }] };
    expect(buildPlan(soon, [], emptyScenario(account.exportedAt + 500)).upgrades[0].likelyDone).toBe(true);
  });

  it("does not count a finished upgrade as a busy worker", () => {
    const later = buildPlan(account, [], emptyScenario(account.exportedAt + 400 * H));
    const done = later.upgrades.filter((u) => u.lane === "builder" && u.likelyDone && !u.goblin).length;
    const builder = later.lanes.find((l) => l.lane === "builder");
    expect(done).toBeGreaterThan(0);
    expect(builder?.busy).toBe(account.upgrades.filter((u) => u.lane === "builder").length - done);
    expect(builder?.idle).toBe((builder?.capacity ?? 0) - (builder?.busy ?? 0));
  });

  it("reports an idle builder", () => {
    const fewer = { ...account, upgrades: account.upgrades.filter((u) => u.name !== "Gold Storage") };
    const result = buildPlan(fewer, [], emptyScenario(now));
    expect(result.lanes.find((l) => l.lane === "builder")?.idle).toBe(1);
    expect(result.insights).toContainEqual({ code: "idle-builders", lane: "builder", detail: 1 });
  });

  it("keeps goblin workers out of the idle count", () => {
    const goblin = {
      ...account,
      upgrades: [...account.upgrades, { ...account.upgrades[0], key: "g", goblin: true }],
    };
    const summary = buildPlan(goblin, [], emptyScenario(now)).lanes.find((l) => l.lane === "builder");
    expect(summary).toMatchObject({ busy: 6, goblinBusy: 1, idle: 0 });
    // The goblin is a seventh worker while he works: 7 of 7, and 6 of 6 once he is gone.
    expect(summary && laneLoad(summary)).toEqual({ busy: 7, total: 7 });
    const without = buildPlan(account, [], emptyScenario(now)).lanes.find((l) => l.lane === "builder");
    expect(without && laneLoad(without)).toEqual({ busy: 6, total: 6 });
  });

  it("notices a boost running with nobody to use it", () => {
    const idle = { ...account, upgrades: account.upgrades.filter((u) => u.lane !== "pet") };
    expect(buildPlan(idle, [], emptyScenario(now)).insights).toContainEqual({
      code: "boost-without-work",
      lane: "pet",
    });
  });
});
