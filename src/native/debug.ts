/**
 * Only in builds made with PUBLIC_DEBUG_INSETS=1 (Actions > Android > Run workflow > debug). Draws a red line along the
 * very top of the page and prints the numbers that decide where the page sits, so a screenshot says how far down it
 * starts and what the phone reports for the status bar. Normal builds never include it.
 */
export function showInsetsDebug() {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;padding:env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0";
  const line = document.createElement("div");
  line.style.cssText =
    "position:fixed;top:0;left:0;right:0;height:3px;background:red;z-index:99999;pointer-events:none";
  const box = document.createElement("pre");
  box.style.cssText =
    "position:fixed;left:0;right:0;bottom:0;z-index:99999;margin:0;padding:6px;font:11px/1.3 monospace;color:#0f0;background:rgba(0,0,0,.85);white-space:pre-wrap;pointer-events:none";
  document.body.append(probe, line, box);

  const update = () => {
    const css = getComputedStyle(probe);
    const view = window.visualViewport;
    const header = document.querySelector("header")?.getBoundingClientRect();
    let widest = "";
    let most = 0;
    for (const el of document.body.querySelectorAll("*")) {
      const right = el.getBoundingClientRect().right;
      if (right > most) {
        most = right;
        widest = `${el.tagName.toLowerCase()}.${(el.getAttribute("class") ?? "").slice(0, 40)}`;
      }
    }
    const doc = document.documentElement;
    box.textContent = [
      `UA ${/Chrome\/[\d.]+/.exec(navigator.userAgent)?.[0] ?? navigator.userAgent}`,
      `window ${innerWidth}x${innerHeight}  screen ${screen.width}x${screen.height}  dpr ${devicePixelRatio}`,
      `env top ${css.paddingTop}  bottom ${css.paddingBottom}`,
      `visualViewport top ${view?.offsetTop}  height ${view?.height}`,
      `header top ${header?.top}  height ${header?.height}  scrollY ${scrollY}`,
      `sideways overflow ${doc.scrollWidth - doc.clientWidth}  rightmost ${Math.round(most)} ${widest}`,
    ].join("\n");
  };
  update();
  window.addEventListener("resize", update);
  window.setInterval(update, 1000);
}
