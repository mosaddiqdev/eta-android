import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { getSettings } from "../settings/settings";
import { showInsetsDebug } from "./debug";
import { paintSystemBars } from "./systemBars";

// Counted from page load. The mark finishes arriving about 520 ms after the splash appears (brand/android), part of
// which has passed by the time the page starts loading, so this hold lets it finish and rest for a beat before the
// fade. Past the longest, the splash goes whatever the page is doing.
const SPLASH_MIN_MS = 350;
const SPLASH_MAX_MS = 1200;

/**
 * Hides the splash once every island has mounted. Timers, not animation frames: while the splash is up Android holds
 * back the app's first frame, so a frame callback waits for something that only comes after the splash is gone.
 */
function hideSplashWhenReady() {
  const poll = () => {
    const elapsed = performance.now();
    // An island that hydrates on load keeps its `ssr` attribute until it has; the page-sized ones render only in the
    // browser, so for those the minimum hold is what gives them time.
    const hydrated = !document.querySelector("astro-island[ssr]");
    if ((hydrated && elapsed >= SPLASH_MIN_MS) || elapsed >= SPLASH_MAX_MS) void SplashScreen.hide();
    else window.setTimeout(poll, 50);
  };
  poll();
}

/**
 * Called once from the shared shell. Inside the app it hands the phone's Back button to the page: an open menu or sheet
 * closes first, then Back goes to the previous page, and from the first page it leaves the app. Without a listener
 * Android would skip the sheets and leave them hanging over the page it just went back to.
 */
export function startApp() {
  if (!Capacitor.isNativePlatform()) return;
  paintSystemBars(getSettings().theme);
  hideSplashWhenReady();
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
