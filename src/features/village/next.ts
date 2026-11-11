import type { Plan, PlannedUpgrade } from "../../village/plan";

/**
 * The upgrade that finishes next. The home village comes first (builders, laboratory, pet house), and the Builder Base
 * only counts when nothing at home is running. Anything that is probably done is not "next".
 */
export function nextToFinish(plan: Plan): PlannedUpgrade | undefined {
  const upcoming = plan.upgrades.filter((u) => !u.likelyDone);
  const home = upcoming.filter((u) => u.lane === "builder" || u.lane === "lab" || u.lane === "pet");
  return (home.length ? home : upcoming)[0];
}
