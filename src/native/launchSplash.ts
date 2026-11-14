import { registerPlugin } from "@capacitor/core";

// The launch splash is Android's own (scripts/android-project.mjs, docs/android.md), animated from the moment of the
// tap. Android keeps it on screen until this says the page is up: loaded, and past the burst of startup work, so the
// splash fades away from a page that is already drawn and still. The native side gives up waiting after 3 seconds, so a
// page that fails to say so can't keep the splash up.
const LaunchSplash = registerPlugin<{ ready(): Promise<void> }>("EtaSplash");

const loaded = () =>
  document.readyState === "complete"
    ? Promise.resolve()
    : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));

// Timers and idle callbacks, not animation frames: the page isn't drawn while the splash holds it, so no frames come.
const idle = () =>
  new Promise<void>((resolve) => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(() => resolve(), { timeout: 400 });
    else setTimeout(resolve, 50);
  });

export async function releaseLaunchSplash() {
  // A page that is about to send the visitor elsewhere (data-leaving, set by the home page) leaves it to the next one.
  if (document.documentElement.hasAttribute("data-leaving")) return;
  // Once per app start. The pages are separate files, so the flag has to outlive a page change but not the app.
  try {
    if (sessionStorage.getItem("clasheta.splashed")) return;
    sessionStorage.setItem("clasheta.splashed", "1");
  } catch {}
  await loaded();
  await idle();
  await LaunchSplash.ready();
}
