import { savedPlans } from "../../native/savedPlans";
import { getSettings } from "../../settings/settings";
import { EtaWidgets } from "../plugin";
import { nextFinishPayload } from "./data";

/** Sends the Next finish widget what it shows. The phone redraws it, and sets its own alarm for the next finish. */
export async function syncNextFinish() {
  await EtaWidgets.update({
    widget: "nextFinish",
    data: nextFinishPayload(await savedPlans(), getSettings().clock),
  });
}
