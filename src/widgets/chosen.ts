import type { Village } from "../notifications/compose";

/** The saved village whose tag is `main`, or undefined when none is set or it has since been forgotten. */
export const mainVillage = (villages: Village[], main: string) =>
  villages.find((v) => v.account.tag === main);

/**
 * The village a one-village widget shows: the main village if there is one, else the one opened last, else the first.
 * Undefined when nothing is saved.
 */
export function chosenVillage(villages: Village[], main: string, active: string | null): Village | undefined {
  return mainVillage(villages, main) ?? villages.find((v) => v.account.tag === active) ?? villages[0];
}
