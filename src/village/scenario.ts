import type { Lane } from "./types";

/** Something the player is thinking of doing, on top of what the export already shows. */
export interface PotionUse {
  source: "potion" | "snack";
  lane: "builder" | "lab" | "pet";
  count: number;
  /** Unix seconds when it is used. */
  at: number;
}

export interface HelperAssign {
  key: string;
  /** Unix seconds; defaults to the first moment the helper is ready. */
  at?: number;
  recurrent?: boolean;
}

export interface Scenario {
  /** Unix seconds "now". */
  now: number;
  potions: PotionUse[];
  helpers: HelperAssign[];
  /** The Clock Tower is used once, as soon as it is ready or at `at`. null when nothing is planned. */
  clockTower: { at: number } | null;
}

export const emptyScenario = (now: number): Scenario => ({ now, potions: [], helpers: [], clockTower: null });

export const helperKindOf = (lane: Lane) => (lane === "builder" ? "builder" : lane === "lab" ? "lab" : null);
