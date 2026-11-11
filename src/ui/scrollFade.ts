/** How wide the soft edge is, in px. It grows from nothing to this as the row is scrolled away from that edge. */
const FADE = 28;

/**
 * A ref callback for a row that scrolls sideways: it fades an edge only while there is more hidden behind that edge.
 * At the very start the left edge is clean, at the very end the right edge is clean, and a row that fits shows no
 * fade at all. The edge also eases in over the first few pixels of scrolling instead of popping on.
 *
 * It only writes `--fade-l` and `--fade-r` (px) and marks the row `data-scroll-fade`; the mask itself lives in
 * base.css. Use it as `ref={scrollFade}`; React 19 runs the returned function when the row goes away.
 */
export function scrollFade(el: HTMLElement | null) {
  if (!el) return;
  el.dataset.scrollFade = "";
  let frame = 0;

  const measure = () => {
    frame = 0;
    const room = el.scrollWidth - el.clientWidth;
    // Rows that fit, or that are not on screen yet (drawers start hidden), have nothing to fade.
    const left = room > 1 ? Math.min(Math.max(el.scrollLeft, 0), FADE) : 0;
    const right = room > 1 ? Math.min(Math.max(room - el.scrollLeft, 0), FADE) : 0;
    el.style.setProperty("--fade-l", `${Math.round(left)}px`);
    el.style.setProperty("--fade-r", `${Math.round(right)}px`);
  };
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };

  el.addEventListener("scroll", queue, { passive: true });
  // The row's own size, and its items coming and going or changing size, all change how far it can scroll.
  const resize = new ResizeObserver(queue);
  const watchItems = () => {
    resize.disconnect();
    resize.observe(el);
    for (const child of el.children) resize.observe(child);
    queue();
  };
  const mutations = new MutationObserver(watchItems);
  mutations.observe(el, { childList: true });
  watchItems();

  return () => {
    el.removeEventListener("scroll", queue);
    resize.disconnect();
    mutations.disconnect();
    if (frame) cancelAnimationFrame(frame);
  };
}
