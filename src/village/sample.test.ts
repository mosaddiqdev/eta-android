import { describe, expect, it } from "vitest";
import { gameCatalog } from "../game/catalog";
import { snapshotCatalog } from "../test/catalog";
import { parseExport } from "./parse";
import { buildPlan } from "./plan";
import { loadSample } from "./sample";
import { emptyScenario } from "./scenario";

const NOW = 1_800_000_000;

// The frozen catalog keeps this test steady; the live one tells us when a game update has made the sample stale.
for (const [name, catalog] of [
  ["frozen catalog", snapshotCatalog],
  ["live catalog", gameCatalog],
] as const) {
  describe(`sample village (${name})`, () => {
    const read = async () => {
      const { account, warnings } = parseExport(await loadSample(NOW), catalog);
      return { account, warnings, plan: buildPlan(account, warnings, emptyScenario(NOW)) };
    };

    it("reads cleanly: every id is known and no timer outlasts its upgrade", async () => {
      const { account, warnings } = await read();
      expect(warnings).toEqual([]);
      expect(account.upgrades.length).toBeGreaterThan(0);
      for (const u of account.upgrades) {
        expect(u.kind, u.name).not.toBe("unknown");
        if (u.total !== null) expect(u.remaining, u.name).toBeLessThanOrEqual(u.total);
      }
    });

    it("keeps every lane busy, so no tab or section opens empty", async () => {
      const { plan } = await read();
      for (const lane of plan.lanes) expect(lane.busy, lane.lane).toBeGreaterThan(0);
    });

    it("never has more work running than workers, and leaves one builder free", async () => {
      const { account, plan, warnings } = await read();
      expect(warnings.find((w) => w.code === "over-capacity")).toBeUndefined();
      const builder = plan.lanes.find((l) => l.lane === "builder");
      expect(account.capacity.builder).toBe(6);
      expect(builder?.idle).toBe(1);
      expect(plan.insights).toContainEqual({ code: "idle-builders", lane: "builder", detail: 1 });
    });
  });
}
