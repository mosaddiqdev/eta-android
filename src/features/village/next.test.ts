import { describe, expect, it } from "vitest";
import type { Plan } from "../../village/plan";
import { nextToFinish } from "./next";

const plan = (...rows: { key: string; lane: string; likelyDone?: boolean }[]) =>
  ({ upgrades: rows.map((r) => ({ likelyDone: false, ...r })) }) as unknown as Plan;

describe("nextToFinish", () => {
  it("is the first upgrade that is not done", () => {
    const rows = plan({ key: "a", lane: "builder", likelyDone: true }, { key: "b", lane: "builder" });
    expect(nextToFinish(rows)?.key).toBe("b");
  });

  it("prefers the home village over the Builder Base", () => {
    const rows = plan({ key: "bb", lane: "bbBuilder" }, { key: "home", lane: "lab" });
    expect(nextToFinish(rows)?.key).toBe("home");
  });
});
