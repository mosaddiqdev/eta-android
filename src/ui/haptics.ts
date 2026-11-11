import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { getSettings } from "../settings/settings";

/**
 * A buzz confirms a change the person just made, and only that. It never stands alone: every buzz sits next to
 * something visible. Call it from the one place that changes the state, and only when it did change, so a tap and a
 * swipe feel the same and a tap that does nothing stays silent. Rules and the full list: docs/motion.md.
 *
 * `tick` is light, for picking among options or stepping a count. `confirm` is firmer, for flipping a switch or
 * committing a choice.
 */
const TICK_MS = 10;
const CONFIRM_MS = 20;
/** Buzzes closer together than this are dropped, so fast tapping or swiping stays a series of taps, not one long hum. */
const MIN_GAP_MS = 70;

let last = Number.NEGATIVE_INFINITY;

function buzz(style: ImpactStyle, ms: number) {
  // Only where the phone can do it, on a touch screen, and if wanted. Inside the app the plugin does it.
  if (!getSettings().haptics || !canVibrate()) return;
  if (!window.matchMedia("(pointer: coarse)").matches) return;
  const now = performance.now();
  if (now - last < MIN_GAP_MS) return;
  last = now;
  if (Capacitor.isNativePlatform()) void Haptics.impact({ style }).catch(() => {});
  else navigator.vibrate(ms);
}

/** Light: a pick among options or a step in a count. */
export const tick = () => buzz(ImpactStyle.Light, TICK_MS);

/** Firmer: a switch flipped or a choice committed. */
export const confirm = () => buzz(ImpactStyle.Medium, CONFIRM_MS);

/** Whether this phone can buzz at all, so Settings only offers the switch where it does something. */
export const canVibrate = () =>
  Capacitor.isNativePlatform() ||
  (typeof navigator !== "undefined" && typeof navigator.vibrate === "function");
