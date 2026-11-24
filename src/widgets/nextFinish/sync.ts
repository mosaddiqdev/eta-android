import { savedPlans } from "../../native/savedPlans";
import { getSettings } from "../../settings/settings";
import { mainVillage } from "../chosen";
import { EtaWidgets } from "../plugin";
import { nextFinishPayload } from "./data";

/**
 * Sends the Next finish widget what it shows: every saved village, or only the main one when the player has set one. The
 * phone redraws it, and sets its own alarm for the next finish.
 */
export async function syncNextFinish() {
  const { clock, mainVillage: main } = getSettings();
  const villages = await savedPlans();
  const only = mainVillage(villages, main);
  await EtaWidgets.update({
    widget: "nextFinish",
    data: nextFinishPayload(only ? [only] : villages, clock),
  });
}
