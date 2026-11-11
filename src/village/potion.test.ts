import { describe, expect, it } from "vitest";
import { snapshotCatalog } from "../test/catalog";
import one from "./fixtures/account-1.json";
import { parseExport } from "./parse";
import { buildPlan } from "./plan";
import { helperOptions, helperPreview, potionImpact, potionOutlook } from "./potion";
import { emptyScenario } from "./scenario";

const H = 3600;
const load = (data: unknown) => parseExport(data, snapshotCatalog).account;
const account = load(one);
const now = account.exportedAt + 100;

describe("potionImpact", () => {
  it("saves nine hours on every builder when all six are busy", () => {
    const impact = potionImpact(account, { source: "potion", lane: "builder", count: 1, at: now }, now);
    expect(impact.perUpgrade).toHaveLength(6);
    expect(impact.perUpgrade.every((u) => u.work === 9 * H)).toBe(true);
    expect(impact.work).toBe(54 * H);
    // A helper that was going to work later already covers part of that tail, so the finish moves less.
    expect(impact.saved).toBeLessThanOrEqual(impact.work);
    expect(impact.saved).toBeGreaterThan(40 * H);
    expect(impact.efficiency).toBe(1);
    expect(impact.wasted).toBe(0);
  });

  it("wastes the part of the hour a worker has no work for", () => {
    const small = load({
      tag: "#X",
      timestamp: 1000,
      buildings: [
        { data: 1000015, lvl: 1, cnt: 5 },
        { data: 1000013, lvl: 3, timer: 600 },
        { data: 1000013, lvl: 3, timer: 200000 },
      ],
    });
    const impact = potionImpact(small, { source: "potion", lane: "builder", count: 1, at: 1000 }, 1000);
    expect(impact.perUpgrade.map((u) => u.work).sort((a, b) => a - b)).toEqual([540, 9 * H]);
    expect(impact.perUpgrade.map((u) => u.saved).sort((a, b) => a - b)).toEqual([540, 9 * H]);
    expect(impact.potential).toBe(5 * 9 * H);
    expect(impact.wasted).toBe(5 * 9 * H - 540 - 9 * H);
    expect(impact.efficiency).toBeLessThan(0.25);
  });

  it("counts a snack on both the lab and the pet house", () => {
    const soup = potionImpact(account, { source: "snack", lane: "lab", count: 1, at: now }, now);
    expect(soup.perUpgrade.map((u) => u.name).sort()).toEqual(["Diggy", "Thrower"]);
  });
});

describe("potionOutlook", () => {
  it("offers now and each moment a builder frees up", () => {
    const outlook = potionOutlook(account, "potion", "builder", 1, now);
    expect(outlook[0].at).toBe(now);
    expect(outlook.length).toBeGreaterThan(1);
    expect(outlook.every((o, i) => i === 0 || o.at > outlook[i - 1].at)).toBe(true);
  });
});

describe("helperOptions", () => {
  it("is ready when the shared cooldown ends", () => {
    const result = helperOptions(account, "builder", now);
    expect(result.readyAt).toBe(account.exportedAt + 65562);
    expect(result.helper?.bonus).toBe(8);
  });

  it("skips the upgrade that already keeps the helper", () => {
    const result = helperOptions(account, "builder", now);
    expect(result.options).toHaveLength(5);
    expect(
      result.options.every(
        (o) => o.key !== account.upgrades.find((u) => u.helper?.recurrent && u.lane === "builder")?.key,
      ),
    ).toBe(true);
  });

  it("ranks by what keeping the helper assigned would save", () => {
    const { options } = helperOptions(account, "builder", now);
    for (let i = 1; i < options.length; i++)
      expect(options[i - 1].savedRecurrent).toBeGreaterThanOrEqual(options[i].savedRecurrent);
    expect(options[0].saved).toBe(8 * H);
    expect(options.every((o) => o.savedRecurrent >= o.saved)).toBe(true);
  });
});

describe("helperPreview", () => {
  const scenario = emptyScenario(now);
  const plan = buildPlan(account, [], scenario);
  const kept = plan.upgrades.find((u) => u.helper?.recurrent && u.lane === "builder");
  const other = plan.upgrades.find((u) => u.lane === "builder" && !u.helper?.recurrent);

  it("matches what helperOptions says keeping the helper assigned would save", () => {
    if (!other) throw new Error("fixture has no free builder upgrade");
    const option = helperOptions(account, "builder", now).options.find((o) => o.key === other.key);
    const preview = helperPreview(account, other, scenario);
    expect(preview?.saved).toBe(option?.savedRecurrent);
    expect(preview?.trial.finishAt).toBeLessThan(other.finishAt);
  });

  it("has nothing to try on the upgrade that already keeps the helper", () => {
    if (!kept) throw new Error("fixture has no kept upgrade");
    expect(helperPreview(account, kept, scenario)).toBeNull();
  });

  it("says what the upgrade that keeps the helper would lose when it moves", () => {
    if (!other || !kept) throw new Error("fixture is missing an upgrade");
    const leaves = helperPreview(account, other, scenario)?.leaves;
    expect(leaves?.name).toBe(kept.name);
    expect(leaves?.cost).toBeGreaterThan(0);
  });

  it("does not touch the scenario it was given", () => {
    if (!other) throw new Error("fixture has no free builder upgrade");
    helperPreview(account, other, scenario);
    expect(scenario.helpers).toEqual([]);
  });
});
