import { describe, expect, it } from "vitest";
import { forecast } from "../../engine/finish";
import { ITEMS } from "../../engine/items";
import type { Plan } from "./useFinishTime";
import { describeSuggestion, verdictFor } from "./verdict";

const H = 3600;
const [potion, bite] = ITEMS.filter((item) => item.works.includes("builder"));

// Build just enough of a plan for the wording; the numbers come from the real engine.
function planFor(remainingHours: number, counts: [number, number], needed: [number | null, number | null]) {
  const result = forecast(remainingHours * H, [
    { bonus: potion.bonus, count: counts[0], usedAgo: 0 },
    { bonus: bite.bonus, count: counts[1], usedAgo: 0 },
  ]);
  return {
    result,
    boosts: [
      { item: potion, count: counts[0], needed: needed[0] },
      { item: bite, count: counts[1], needed: needed[1] },
    ],
  } as unknown as Plan;
}

describe("verdictFor", () => {
  it("offers fewer uses of whichever item has spare", () => {
    const verdict = verdictFor(planFor(5, [3, 2], [1, 2]));
    expect(verdict.tone).toBe("good");
    expect(verdict.options.map(describeSuggestion)).toEqual(["2 fewer Builder Potions"]);
  });

  it("offers the smallest additions when the boost runs out", () => {
    const verdict = verdictFor(planFor(30, [1, 0], [3, 12]));
    expect(verdict.tone).toBe("short");
    expect(verdict.options.map(describeSuggestion)).toEqual([
      "2 more Builder Potions",
      "12 more Builder Bites",
    ]);
  });

  it("skips items that can't finish it at all", () => {
    const verdict = verdictFor(planFor(30, [1, 0], [3, null]));
    expect(verdict.options.map(describeSuggestion)).toEqual(["2 more Builder Potions"]);
  });
});
