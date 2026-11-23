import { savedPlans } from "../../native/savedPlans";
import { getSettings } from "../../settings/settings";
import { EtaWidgets } from "../plugin";
import { villagesPayload } from "./data";

/** Sends the Villages widget what it shows. The phone redraws it, and sets its own alarm for the next finish. */
export async function syncVillages() {
  await EtaWidgets.update({
    widget: "villages",
    data: villagesPayload(await savedPlans(), getSettings().clock),
  });
}
