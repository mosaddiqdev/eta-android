import { describe, expect, it } from "vitest";
import { snapshotCatalog } from "../../test/catalog";
import one from "../../village/fixtures/account-1.json";
import { parseExport } from "../../village/parse";
import { buildPlan } from "../../village/plan";
import { emptyScenario } from "../../village/scenario";
import { detailOf, nextFinishPayload } from "./data";

const { account, warnings } = parseExport(one, snapshotCatalog);
const now = account.exportedAt;
const village = { account, plan: buildPlan(account, warnings, emptyScenario(now)) };

describe("Next finish widget data", () => {
  it("lists running upgrades soonest first, in milliseconds", () => {
    const [saved] = nextFinishPayload([village], "auto").villages;
    expect(saved.upgrades.length).toBeGreaterThan(0);
    const times = saved.upgrades.map((u) => u.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[0]).toBeGreaterThan(now * 1000);
  });

  it("carries the clock setting and every kind of worker, Builder Base included", () => {
    const payload = nextFinishPayload([village], "24");
    expect(payload.clock).toBe("24");
    const lanes = payload.villages[0].lanes;
    expect(lanes.map((l) => l.lane)).toEqual(["builder", "lab", "pet", "bbBuilder", "bbLab"]);
    expect(lanes[0].capacity).toBe(account.capacity.builder);
    expect(lanes[3].name).toBe("Builder Base");
  });

  it("leaves out what has probably finished", () => {
    const later = { account, plan: buildPlan(account, warnings, emptyScenario(now + 400 * 86_400)) };
    expect(nextFinishPayload([later], "auto").villages[0].upgrades).toEqual([]);
  });

  it("words what the upgrade is doing", () => {
    const base = { gearUp: false, firstBuild: false, crafting: false, fromLevel: 13, toLevel: 14 };
    expect(detailOf(base)).toBe("Level 13 → 14");
    expect(detailOf({ ...base, gearUp: true })).toBe("Gear up");
    expect(detailOf({ ...base, firstBuild: true })).toBe("New building");
    expect(detailOf({ ...base, crafting: true })).toBe("Crafting");
  });
});
