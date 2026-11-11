import { useCallback, useMemo, useRef, useState } from "react";
import { buildPlan, type Plan } from "../../village/plan";
import { emptyScenario, type PotionUse, type Scenario } from "../../village/scenario";
import { useNow } from "./useNow";
import { useVillages } from "./useVillages";

export type { ImportIntent, ImportOutcome, Status } from "./useVillages";
export type MyVillage = ReturnType<typeof useMyVillage>;

export function useMyVillage() {
  const [potions, setPotions] = useState<PotionUse[]>([]);
  const now = useNow();
  // Everything on screen is measured against the ticking `now`. The plan must use that same clock, not a fresh
  // Date.now(): that runs up to a second ahead, so a potion planned "now" would start in the future for a moment
  // (its icon missing, a helper or the Clock Tower reading "Ready today" instead of "Ready now") until the next tick.
  const nowRef = useRef(now);
  nowRef.current = now;

  const resetScenario = useCallback(() => {
    setPotions([]);
  }, []);

  const village = useVillages(resetScenario);
  const { loaded, status } = village;

  /** Plans `count` of an item for now, replacing any earlier plan for it. Zero removes it. */
  const setPotion = useCallback((use: Omit<PotionUse, "at">) => {
    setPotions((current) => {
      const others = current.filter((u) => !(u.source === use.source && u.lane === use.lane));
      return use.count > 0 ? [...others, { ...use, at: nowRef.current }] : others;
    });
  }, []);

  const minute = Math.floor(now / 60);
  // `minute` is a deliberate trigger: "now" for the scenario refreshes once a minute, not every second.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  const scenario = useMemo<Scenario>(
    // Helpers are never planned here: only the upgrade sheet previews one, because the game is where they are assigned.
    () => ({ now, potions, helpers: [], clockTower: null }),
    [potions, minute],
  );
  const plan = useMemo<Plan | null>(
    () => (loaded ? buildPlan(loaded.account, loaded.warnings, scenario) : null),
    [loaded, scenario],
  );
  const basePlan = useMemo<Plan | null>(
    () => (loaded ? buildPlan(loaded.account, loaded.warnings, emptyScenario(scenario.now)) : null),
    [loaded, scenario.now],
  );

  const planning = potions.length;

  return {
    ...village,
    status,
    plan,
    basePlan,
    account: loaded?.account ?? null,
    scenario,
    planning,
    now,
    setPotion,
    resetScenario,
  };
}
