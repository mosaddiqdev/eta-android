import { type RefObject, useEffect } from "react";

/**
 * Sets `--stick` on a column so a sticky column behaves like a long page of its own beside a longer one: it scrolls
 * with the page until its bottom comes into view, then stays put while the other column keeps scrolling. A column
 * shorter than the screen simply sticks at the top.
 *
 * That is `top: min(gap, screen - column - gap)`. CSS cannot read the column's height, so it is measured here and
 * re-measured whenever the column or the window changes size (a potion card opening, the list growing).
 */
export function useStickyColumn(ref: RefObject<HTMLElement | null>, ready: boolean, gap = 16) {
  useEffect(() => {
    const el = ref.current;
    if (!ready || !el) return;
    const update = () => {
      const room = window.innerHeight - el.offsetHeight - gap;
      el.style.setProperty("--stick", `${Math.round(Math.min(gap, room))}px`);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [ref, ready, gap]);
}
