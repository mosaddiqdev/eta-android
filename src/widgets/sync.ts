import { syncNextFinish } from "./nextFinish/sync";
import { canWidget } from "./plugin";
import { syncVillages } from "./villages/sync";
import { syncWorkers } from "./workers/sync";

// One place that knows every widget, so the rest of the app only says "the villages or the settings changed". A widget
// adds its sync to `all` and nothing else changes. Runs one at a time, newest last, like the notification sync.
const all = [syncNextFinish, syncVillages, syncWorkers];

let queue: Promise<void> = Promise.resolve();
let waiting: ReturnType<typeof setTimeout> | undefined;

/** Draws every widget from what is saved now, and resolves when that is done. For a page that closes right after. */
export function syncWidgetsNow(): Promise<void> {
  if (!canWidget()) return Promise.resolve();
  queue = queue.then(() => Promise.all(all.map((sync) => sync().catch(() => {}))).then(() => {}));
  return queue;
}

/** Safe to call often; calls close together become one. */
export function syncWidgets() {
  if (!canWidget()) return;
  clearTimeout(waiting);
  waiting = setTimeout(() => void syncWidgetsNow(), 500);
}
