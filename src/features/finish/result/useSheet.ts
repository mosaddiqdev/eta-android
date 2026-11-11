import { type PointerEvent, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

const DESKTOP = "(min-width: 48rem)";
// Under this much finger travel a touch is still a tap, so the button's own click toggles the sheet.
const TAP_SLOP = 6;
// px per ms. A quick flick decides the direction no matter where the finger let go.
const FLING = 0.45;
// Past either end the sheet follows the finger at a quarter of the distance, so the limit is felt.
const RESISTANCE = 0.25;

const slide = (panel: HTMLElement | null, offset: number) => panel?.style.setProperty("--y", `${offset}px`);

const watchDesktop = (notify: () => void) => {
  const query = matchMedia(DESKTOP);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

interface Drag {
  startY: number;
  startOffset: number;
  offset: number;
  samples: { t: number; y: number }[];
  moved: boolean;
}

/**
 * One persistent bottom sheet with three resting places: hidden-to-a-sliver ("empty": only the prompt shows),
 * closed (the result's summary shows) and open. The panel always lays out at full height and only a transform
 * moves it, so every change between the three is a GPU slide that never reflows. On desktop the panel is a
 * card instead, and its height is animated to follow whichever content is showing.
 */
export function useSheet(active: boolean, hasLive: boolean) {
  const [wantsOpen, setWantsOpen] = useState(false);
  const desktop = useSyncExternalStore(
    watchDesktop,
    () => matchMedia(DESKTOP).matches,
    () => false,
  );
  const open = active && wantsOpen;
  const panel = useRef<HTMLDivElement>(null);
  const hidden = useRef<HTMLDivElement>(null);
  const empty = useRef<HTMLDivElement>(null);
  const live = useRef<HTMLDivElement>(null);
  const travel = useRef(0);
  const drag = useRef<Drag | null>(null);
  const swallowClick = useRef(false);
  const lastFull = useRef(0);
  const restAt = useRef(0);

  useEffect(() => {
    if (!active) setWantsOpen(false);
  }, [active]);

  // Lets the height transition run, but not for the very first measurement.
  useEffect(() => {
    const frame = requestAnimationFrame(() => panel.current?.setAttribute("data-ready", "true"));
    return () => cancelAnimationFrame(frame);
  }, []);

  // `hasLive` is a trigger: the result layer (and so the refs observed here) only exists once it is true.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useLayoutEffect(() => {
    const box = panel.current;
    if (!box) return;

    const emptyPeek = () => empty.current?.offsetHeight ?? 0;
    const restingOffset = () => {
      if (!active) return Math.max(0, box.offsetHeight - emptyPeek());
      return open ? 0 : travel.current;
    };

    const measure = () => {
      const part = hidden.current;
      // The part's bottom padding is the home-indicator gap, which should stay visible when closed.
      const padding = part ? Number.parseFloat(getComputedStyle(part).paddingBottom) || 0 : 0;
      travel.current = part ? Math.max(0, part.offsetHeight - padding) : 0;

      // Desktop card: its height follows the content that is showing.
      const height = active ? (live.current?.offsetHeight ?? 0) : emptyPeek();
      box.style.setProperty("--stage-h", `${height}px`);

      const full = box.offsetHeight;
      if (!drag.current && !box.hasAttribute("data-snap")) {
        // The panel grew or shrank (a result arrived, or its summary changed height). Hold the part on screen
        // exactly where it was, then ease to the new resting place, so the sheet glides instead of jumping.
        if (lastFull.current && full !== lastFull.current && !matchMedia(DESKTOP).matches) {
          box.setAttribute("data-snap", "true");
          slide(box, restAt.current + full - lastFull.current);
          void box.offsetHeight;
          box.removeAttribute("data-snap");
        }
        restAt.current = restingOffset();
        slide(box, restAt.current);
      }
      lastFull.current = full;
      // The page reserves exactly what the sheet shows at rest, so the lowest control is never hidden behind it.
      const peek = active ? full - travel.current : emptyPeek();
      document.documentElement.style.setProperty("--dock-h", `${peek}px`);
    };

    measure();

    const observer = new ResizeObserver(measure);
    for (const el of [hidden.current, empty.current, live.current, box]) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [active, open, hasLive]);

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("--dock-h");
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setWantsOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);

  const follow = (offset: number) =>
    offset < 0
      ? offset * RESISTANCE
      : offset > travel.current
        ? travel.current + (offset - travel.current) * RESISTANCE
        : offset;

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (desktop || !active || event.button !== 0) return;
    swallowClick.current = false;
    const startOffset = open ? 0 : travel.current;
    drag.current = {
      startY: event.clientY,
      startOffset,
      offset: startOffset,
      samples: [{ t: event.timeStamp, y: event.clientY }],
      moved: false,
    };
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current) return;
    const delta = event.clientY - current.startY;
    if (!current.moved) {
      if (Math.abs(delta) < TAP_SLOP) return;
      current.moved = true;
      // Capture only once it is a drag; capturing on press would steal the click from the toggle button.
      event.currentTarget.setPointerCapture(event.pointerId);
      panel.current?.setAttribute("data-dragging", "true");
    }
    current.samples = [...current.samples, { t: event.timeStamp, y: event.clientY }].slice(-5);
    current.offset = current.startOffset + delta;
    slide(panel.current, follow(current.offset));
  }

  function onPointerEnd() {
    const current = drag.current;
    drag.current = null;
    panel.current?.removeAttribute("data-dragging");
    if (!current?.moved) return;

    swallowClick.current = true;
    const first = current.samples[0];
    const last = current.samples[current.samples.length - 1];
    const velocity = (last.y - first.y) / Math.max(1, last.t - first.t);
    const next = Math.abs(velocity) > FLING ? velocity < 0 : current.offset < travel.current / 2;
    setWantsOpen(next);
    slide(panel.current, next ? 0 : travel.current);
  }

  function onToggleClick() {
    if (swallowClick.current) {
      swallowClick.current = false;
      return;
    }
    setWantsOpen((value) => !value);
  }

  return {
    open: desktop || open,
    desktop,
    panel,
    hidden,
    empty,
    live,
    close: () => setWantsOpen(false),
    onToggleClick,
    grab: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd },
  };
}
