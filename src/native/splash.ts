// The launch splash (src/ui/Splash.astro, src/styles/splash.css) plays by itself from the first paint. This only decides
// when it ends: not before the mark has arrived and had a beat of rest, and not before the page underneath has stopped
// starting up, so the fade never lands on a busy moment. Timers and idle callbacks, nothing that needs a frame.

const MIN_MS = 750;
const MAX_MS = 2000;
const FADE_MS = 220;

export function endSplashWhenReady() {
  const root = document.documentElement;
  if (!root.hasAttribute("data-splash")) return;
  // Once per app start. The page is a few files, so the flag has to outlive a page change but not the app.
  try {
    sessionStorage.setItem("clasheta.splashed", "1");
  } catch {}

  const started = performance.now();
  const leave = () => {
    root.setAttribute("data-splash", "leaving");
    window.setTimeout(() => {
      document.querySelector(".splash")?.remove();
      root.removeAttribute("data-splash");
    }, FADE_MS + 60);
  };
  const idle = () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(leave, { timeout: 400 });
    else leave();
  };
  const check = () => {
    const waited = performance.now() - started;
    if (waited >= MAX_MS) leave();
    else if (waited >= MIN_MS && document.readyState === "complete") idle();
    else window.setTimeout(check, 50);
  };
  check();
}
