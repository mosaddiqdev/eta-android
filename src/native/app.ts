import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { VILLAGES_CHANGED } from "../features/village/villages";
import { getSettings, watchSettings } from "../settings/settings";
import { showInsetsDebug } from "./debug";
import { releaseLaunchSplash } from "./launchSplash";
import { applyNativeTheme } from "./nativeTheme";
import { syncNotifications, syncNotificationsOnLaunch } from "./notificationSync";
import { paintSystemBars } from "./systemBars";

/**
 * Called once from the shared shell. Inside the app it hands the phone's Back button to the page: an open menu or sheet
 * closes first, then Back goes to the previous page, and from the first page it leaves the app. Without a listener
 * Android would skip the sheets and leave them hanging over the page it just went back to.
 */
export function startApp() {
  if (!Capacitor.isNativePlatform()) return;
  paintSystemBars(getSettings().theme);
  applyNativeTheme(getSettings().theme);
  // The alarms outlive the app but not a restart or an update, and the saved villages can change while it is closed, so
  // every start sets them again once the page is up.
  void releaseLaunchSplash().then(syncNotificationsOnLaunch);
  window.addEventListener(VILLAGES_CHANGED, syncNotifications);
  watchSettings((next, previous) => {
    if (next.theme !== previous.theme) applyNativeTheme(next.theme);
    // Everything the notifications are made from. Theme, clock and the rest don't change them.
    const fields = [
      "notify",
      "notifyOff",
      "notifySound",
      "notifySounds",
      "quietHours",
      "quietFrom",
      "quietTo",
    ] as const;
    const changed = fields.some((field) => JSON.stringify(next[field]) !== JSON.stringify(previous[field]));
    if (changed) syncNotifications();
  });
  if (import.meta.env.PUBLIC_DEBUG_INSETS === "1") showInsetsDebug();

  void App.addListener("backButton", ({ canGoBack }) => {
    // The last one in the page is the one opened most recently: a sheet opens over the menu that launched it.
    const sheet = [...document.querySelectorAll<HTMLDialogElement>("dialog[open]")].at(-1);
    if (sheet) {
      // Each sheet answers Escape with its own animated close. One that doesn't is closed outright.
      const handled = !sheet.dispatchEvent(new Event("cancel", { cancelable: true }));
      if (!handled) sheet.close();
    } else if (canGoBack) history.back();
    else void App.exitApp();
  });
}
