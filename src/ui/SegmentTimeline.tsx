import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { formatClock } from "../engine/time";
import { tick } from "./haptics";
import styles from "./SegmentTimeline.module.css";
import { type Booster, SourceStack } from "./SourceStack";
import { scrollFade } from "./scrollFade";

/** One stretch of an upgrade at one speed. `start` and `end` are seconds from now; `id` stays the same as the stretch is eaten into. */
export interface Stretch {
  id: number;
  start: number;
  end: number;
  speed: number;
}

interface Props {
  /** In order, from now to done, already cut so the first one starts at 0 or later. */
  segments: Stretch[];
  /** The pictures of what makes a boosted stretch fast. */
  boostersFor: (s: Stretch) => Booster[];
  /** When a stretch begins, in words ("Today, 4:10 PM"). */
  startsAt: (s: Stretch) => string;
}

/**
 * Everything still ahead of an upgrade, as one bar and the same stretches again as pills in a row you can scroll.
 * The two are one list drawn twice, and they point at each other: the stretches that are on screen in the row stay
 * lit on the bar and the rest dim, so the bar is also a map of where the row is; pressing a pill or a stretch marks
 * it in both. Each pill is built like the speed pill on a row: the pictures of what causes the speed, then the speed.
 * The village drawer and the calculator's result sheet both draw this.
 */
export function SegmentTimeline({ segments, boostersFor, startsAt }: Props) {
  // An hour of boost on an eight-day upgrade would be a sliver, so boosted stretches get a minimum width. With many
  // of them (a helper that repeats) they share half the bar between them, so none grows past what it can afford.
  const span = segments.reduce((sum, s) => sum + (s.end - s.start), 0);
  const boosted = segments.filter((s) => s.speed > 1).length;
  const floor = span * Math.min(0.16, 0.5 / Math.max(boosted, 1));
  const enlarged = segments.some((s) => s.speed > 1 && s.end - s.start < floor);
  const weight = (s: (typeof segments)[number]) =>
    s.speed > 1 ? Math.max(s.end - s.start, floor) : s.end - s.start;
  const drawn = segments.reduce((sum, s) => sum + weight(s), 0);

  // Each boosted speed gets its own depth of the lane color, so one boost, two and three do not look alike. The
  // slowest boost is the plain lane color and the fastest is the most pronounced, evenly spaced in between (0 to 1).
  // Ranked by speed because that is what the bar says, so it works for any number of boosts. Every step stays a solid,
  // vivid color: only its lightness moves.
  const speeds = [...new Set(segments.filter((s) => s.speed > 1).map((s) => s.speed))].sort((a, b) => a - b);
  const depth = (speed: number) => (speeds.length > 1 ? speeds.indexOf(speed) / (speeds.length - 1) : 0);

  const [focus, setFocus] = useState<number | null>(null);
  const [visible, setVisible] = useState<Set<number>>(new Set());
  const rail = useRef<HTMLDivElement | null>(null);
  const railRef = useCallback((el: HTMLDivElement | null) => {
    rail.current = el;
    return scrollFade(el);
  }, []);
  const figure = useRef<HTMLElement>(null);
  const count = segments.length;

  // Which pills are fully on screen in the row. Read from where they sit, not from an observer: the drawer is
  // hidden when this mounts, and an observer then reports nothing is visible until something scrolls.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the pills are rebuilt only when their number changes
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      if (el.clientWidth === 0) return;
      const from = el.scrollLeft;
      const to = from + el.clientWidth;
      const next = new Set<number>();
      for (const pill of el.querySelectorAll<HTMLElement>("[data-i]")) {
        const left = pill.offsetLeft;
        const right = left + pill.offsetWidth;
        if (
          right > from + 2 &&
          left < to - 2 &&
          Math.min(right, to) - Math.max(left, from) >= pill.offsetWidth * 0.7
        )
          next.add(Number(pill.dataset.i));
      }
      setVisible((prev) => (prev.size === next.size && [...next].every((i) => prev.has(i)) ? prev : next));
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    el.addEventListener("scroll", queue, { passive: true });
    const resize = new ResizeObserver(queue);
    resize.observe(el);
    queue();
    return () => {
      el.removeEventListener("scroll", queue);
      resize.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [count]);

  // A pick stays only while you are looking at the timeline: a press anywhere that is not one of its pills or
  // stretches (the page, the sheet, another button) lets go of it. A click, not a press, so starting to scroll
  // the page does not clear it.
  useEffect(() => {
    if (focus === null) return;
    const away = (event: MouseEvent) => {
      const hit = (event.target as Element | null)?.closest("[data-i]");
      if (hit && figure.current?.contains(hit)) return;
      setFocus(null);
    };
    document.addEventListener("click", away, true);
    return () => document.removeEventListener("click", away, true);
  }, [focus]);

  if (count === 0) return null;

  const choose = (i: number, reveal: boolean) => {
    tick();
    // Pressing the one that is already picked puts it down again, as a pressed button should.
    if (segments[i]?.id === focus) {
      setFocus(null);
      return;
    }
    setFocus(segments[i]?.id ?? null);
    if (!reveal) return;
    // Scroll the row itself. scrollIntoView would also slide the drawer sideways when the last pill is centred.
    const el = rail.current;
    const pill = el?.querySelector<HTMLElement>(`[data-i="${i}"]`);
    if (!el || !pill) return;
    const left = pill.offsetLeft - (el.clientWidth - pill.offsetWidth) / 2;
    el.scrollTo({ left: Math.max(0, Math.min(left, el.scrollWidth - el.clientWidth)), behavior: "smooth" });
  };

  // Dim only when the row cannot show everything, and only the stretches that are out of view.
  const partial = visible.size > 0 && visible.size < count;
  const lit = (i: number) => !partial || visible.has(i) || segments[i].id === focus;

  return (
    <figure className={styles.timeline} ref={figure}>
      {/* The pills carry the same information for keyboards and screen readers; this is a map for eyes and fingers. */}
      <div
        className={styles.bar}
        aria-hidden="true"
        onClick={(event) => {
          const hit = (event.target as HTMLElement).closest<HTMLElement>("[data-i]");
          if (hit) choose(Number(hit.dataset.i), true);
        }}
      >
        {segments.map((s, i) => (
          <span
            key={s.id}
            data-i={i}
            data-boost={s.speed > 1}
            data-lit={lit(i)}
            data-focus={s.id === focus}
            style={{ flex: `${weight(s)} 1 0`, "--depth": depth(s.speed) } as CSSProperties}
          >
            {s.speed > 1 && weight(s) / drawn >= 0.1 ? `${s.speed}x` : null}
          </span>
        ))}
      </div>

      <div className={styles.rail} ref={railRef}>
        {segments.map((s, i) => {
          const boosters = s.speed > 1 ? boostersFor(s) : [];
          return (
            <button
              key={s.id}
              type="button"
              className={styles.pill}
              data-i={i}
              data-boost={s.speed > 1}
              data-focus={s.id === focus}
              aria-pressed={s.id === focus}
              title={i === 0 ? "Now" : startsAt(s)}
              style={{ "--size": "1.5rem" } as CSSProperties}
              onClick={() => choose(i, true)}
            >
              <SourceStack boosters={boosters} />
              <span className={styles.text}>
                <span className={styles.speed}>
                  {s.speed}x{i === 0 && <small>now</small>}
                </span>
                <span className={styles.len}>{formatClock(s.end - s.start)}</span>
              </span>
              <span className="sr-only">
                {boosters.length > 0 ? `from ${boosters.map((b) => b.label).join(", ")}` : ""}
                {i === 0 ? ", now" : `, starts ${startsAt(s)}`}
              </span>
            </button>
          );
        })}
      </div>

      {enlarged && <figcaption>Boosted stretches are drawn larger than they are.</figcaption>}
    </figure>
  );
}
