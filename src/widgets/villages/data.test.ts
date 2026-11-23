import { describe, expect, it } from "vitest";
import { snapshotCatalog } from "../../test/catalog";
import one from "../../village/fixtures/account-1.json";
import { parseExport } from "../../village/parse";
import { buildPlan } from "../../village/plan";
import { emptyScenario } from "../../village/scenario";
import { villagesPayload } from "./data";

const { account, warnings } = parseExport(one, snapshotCatalog);
const now = account.exportedAt;
const village = { account, plan: buildPlan(account, warnings, emptyScenario(now)) };

describe("Villages widget data", () => {
  it("sends each village with its name, home workers and running upgrades in milliseconds", () => {
    const [saved] = villagesPayload([{ ...village, nickname: "Main" }], "24").villages;
    expect(saved.tag).toBe(account.tag);
    expect(saved.name).toBe("Main");
    expect(saved.lanes.every((l) => ["builder", "lab", "pet"].includes(l.lane))).toBe(true);
    expect(saved.upgrades.length).toBeGreaterThan(0);
    expect(saved.upgrades[0].at).toBeGreaterThan(now * 1000);
  });

  it("leaves the name empty until the player names the village", () => {
    expect(villagesPayload([village], "auto").villages[0].name).toBe("");
  });

  it("carries the clock setting and one entry per village", () => {
    const payload = villagesPayload([village, village], "12");
    expect(payload.clock).toBe("12");
    expect(payload.villages).toHaveLength(2);
  });

  it("only lists a kind of worker when the export says how many there are", () => {
    const unknown = { ...village, account: { ...account, capacity: { ...account.capacity, pet: null } } };
    expect(villagesPayload([unknown], "auto").villages[0].lanes.map((l) => l.lane)).not.toContain("pet");
  });
});
