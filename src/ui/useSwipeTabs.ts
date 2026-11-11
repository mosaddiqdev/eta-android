import { type RefObject, useEffect, useRef } from "react";
import { swipeStep } from "./swipe";

const NARROW = "(max-width: 47.99rem)";

/**
 * Things a swipe must not steal from: marked areas, selects and text areas, and a text field that is being typed in
 * (a sideways drag there moves the cursor or selection). Radios, checkboxes and a field that is not focused are just
 * things on the page: the Finish time categories are radios laid over each tab, and the d/h/m/s boxes are fields, so
 * blocking every input made a swipe dead on the tab row and the time card.
 */
function leavesSwipeAlone(el: Element) {
  if (el.matches("textarea, select, [data-no-swipe]")) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  const tappable = ["radio", "checkbox", "button", "submit", "reset", "range"];
  return !tappable.includes(el.type) && document.activeElement === el;
}

/** True when the touch started somewhere that scrolls sideways by itself, like the row of lane tiles. */
function inSideScroller(target: EventTarget | null, stop: HTMLElement) {
  for (let el = target instanceof Element ? target : null; el && el !== stop; el = el.parentElement) {
    if (leavesSwipeAlone(el)) return true;
    const scrollsSideways =
      el.scrollWidth > el.clientWidth + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowX);
    if (scrollsSideways) return true;
  }
  return false;
}

/**
 * Swiping sideways on a set of tab panels moves to the next or previous tab: the village panels, the Finish time
 * categories and the About sections all use it. Only on a narrow screen, where the tabs are the way to move around;
 * on a wide one the panels are laid out side by side or the tabs sit in a rail. A swipe that starts in a field, a row
 * that scrolls sideways or anything marked `data-no-swipe` is left alone.
 */
export function useSwipeTabs<T extends string>(
  ref: RefObject<HTMLElement | null>,
  tabs: readonly T[],
  current: T,
  onChange: (tab: T) => void,
  active: boolean,
) {
  // The listeners are attached once; they read the latest tab and handler from here instead of being rebuilt each tick.
  const latest = useRef({ tabs, current, onChange });
  latest.current = { tabs, current, onChange };

  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    let start: { x: number; y: number; at: number } | null = null;

    const down = (event: TouchEvent) => {
      const touch = event.touches[0];
      const blocked = event.touches.length !== 1 || !touch || inSideScroller(event.target, el);
      start = blocked ? null : { x: touch.clientX, y: touch.clientY, at: event.timeStamp };
    };
    const up = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      const from = start;
      start = null;
      if (!from || !touch || !window.matchMedia(NARROW).matches) return;
      const { tabs, current, onChange } = latest.current;
      const index = tabs.indexOf(current);
      const dx = touch.clientX - from.x;
      const dy = touch.clientY - from.y;
      const step = swipeStep(dx, dy, event.timeStamp - from.at, index, tabs.length);
      const next = tabs[index + step];
      if (step !== 0 && next) onChange(next);
    };
    const cancel = () => {
      start = null;
    };

    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchend", up, { passive: true });
    el.addEventListener("touchcancel", cancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchend", up);
      el.removeEventListener("touchcancel", cancel);
    };
  }, [ref, active]);
}
