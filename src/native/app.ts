import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";
import { getSettings } from "../settings/settings";
import { showInsetsDebug } from "./debug";
import { paintSystemBars } from "./systemBars";

/** About as long as the splash mark takes to draw itself (500 ms in scripts/android-project.mjs), counted from page load. */
const SPLASH_MS = 520;

/**
 * Called once from the shared shell. Inside the app it hands the phone's Back button to the page: an open menu or sheet
 * closes first, then Back goes to the previous page, and from the first page it leaves the app. Without a listener
 * Android would skip the sheets and leave them hanging over the page it just went back to.
 */
export function startApp() {
  if (!Capacitor.isNativePlatform()) return;
  paintSystemBars(getSettings().theme);
  // The splash stays until the page has painted and the mark has finished weaving in (brand/android), so there is no
  // blank gap and no cut-off animation. It hides itself after 1.5 seconds whatever happens (capacitor.config.json).
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      const hide = () => void SplashScreen.hide({ fadeOutDuration: 150 });
      window.setTimeout(hide, Math.max(0, SPLASH_MS - performance.now()));
    }),
  );
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
