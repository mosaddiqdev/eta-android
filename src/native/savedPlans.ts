import { readVillages } from "../features/village/villages";
import type { Village } from "../notifications/compose";
import { parseExport } from "../village/parse";
import { buildPlan } from "../village/plan";
import { emptyScenario } from "../village/scenario";

/** Every saved village with its plan as of now: what the phone's notifications and widgets are made from. */
export async function savedPlans(): Promise<Village[]> {
  const { gameCatalog } = await import("../game/catalog");
  const now = Math.floor(Date.now() / 1000);
  const found: Village[] = [];
  for (const saved of readVillages().villages) {
    try {
      const { account, warnings } = parseExport(saved.raw, gameCatalog);
      found.push({
        account,
        plan: buildPlan(account, warnings, emptyScenario(now)),
        nickname: saved.nickname,
      });
    } catch {
      // A saved village that no longer reads is dropped by the village page; it just gets nothing here.
    }
  }
  return found;
}
