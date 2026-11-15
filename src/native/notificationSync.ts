import { readVillages } from "../features/village/villages";
import { type Alert, composeAlerts, type Village } from "../notifications/compose";
import { getSettings } from "../settings/settings";
import { parseExport } from "../village/parse";
import { buildPlan } from "../village/plan";
import { canNotify, EtaNotifications } from "./notifications";

// Runs one at a time, newest last, so an import and a settings change close together can't leave the older list armed.
let queue: Promise<void> = Promise.resolve();
let waiting: ReturnType<typeof setTimeout> | undefined;

async function villages(): Promise<Village[]> {
  const { gameCatalog } = await import("../game/catalog");
  const now = Math.floor(Date.now() / 1000);
  const found: Village[] = [];
  for (const saved of readVillages().villages) {
    try {
      const { account, warnings } = parseExport(saved.raw, gameCatalog);
      found.push({
        account,
        plan: buildPlan(account, warnings, { now, potions: [], helpers: [], clockTower: null }),
      });
    } catch {
      // A saved village that no longer reads is dropped by the village page; it just gets no notifications here.
    }
  }
  return found;
}

/** What the phone would be told right now: the settings applied to every saved village. Also what Settings previews. */
export async function plannedAlerts(): Promise<Alert[]> {
  const settings = getSettings();
  return composeAlerts(
    await villages(),
    {
      off: settings.notifyOff,
      notifySound: settings.notifySound,
      notifySounds: settings.notifySounds,
      quiet: settings.quietHours ? { from: settings.quietFrom, to: settings.quietTo } : null,
    },
    Date.now(),
  );
}

async function sync() {
  // Off, or not allowed: clear what was armed, so turning it off really stops them.
  const { permission } = await EtaNotifications.status();
  if (!getSettings().notify || permission !== "granted")
    return void (await EtaNotifications.schedule({ items: [] }));
  await EtaNotifications.schedule({ items: await plannedAlerts() });
}

/** Sets the phone's alarms to match the saved villages and the settings. Safe to call often; calls close together become one. */
export function syncNotifications() {
  if (!canNotify()) return;
  clearTimeout(waiting);
  waiting = setTimeout(() => {
    queue = queue.then(sync).catch(() => {});
  }, 500);
}

/** Once per app start. The pages are separate files, so the flag has to outlive a page change but not the app. */
export function syncNotificationsOnLaunch() {
  try {
    if (sessionStorage.getItem("clasheta.notified")) return;
    sessionStorage.setItem("clasheta.notified", "1");
  } catch {}
  syncNotifications();
}
