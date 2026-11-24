import { readVillages } from "../../features/village/villages";
import { savedPlans } from "../../native/savedPlans";
import { getSettings } from "../../settings/settings";
import { chosenVillage } from "../chosen";
import { nextFinishPayload } from "../nextFinish/data";
import { EtaWidgets } from "../plugin";

/**
 * Sends the Workers widget one village: the main one, else the one opened last. It is the same shape the Next finish
 * widget gets (every kind of worker with its icon, and every running upgrade), so the phone can lay the lanes out the
 * way the Workers tab does and tell which workers are idle.
 */
export async function syncWorkers() {
  const { clock, mainVillage } = getSettings();
  const chosen = chosenVillage(await savedPlans(), mainVillage, readVillages().active);
  await EtaWidgets.update({ widget: "workers", data: nextFinishPayload(chosen ? [chosen] : [], clock) });
}
