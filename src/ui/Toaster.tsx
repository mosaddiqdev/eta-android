import { Check, Info, TriangleAlert } from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import styles from "./Toaster.module.css";
import {
  dismissToast,
  getToast,
  subscribeToast,
  TOAST_MS,
  TOAST_WITH_ACTION_MS,
  type ToastState,
  type ToastTone,
} from "./toast";

const TONE_ICON = { success: Check, neutral: Info, warning: TriangleAlert } satisfies Record<
  ToastTone,
  unknown
>;

// Swipe down to put it away: past 48px, or a quick flick.
const SWIPE_AT = 48;
const FLING = 0.5;
const SLOP = 6;
// Safety net for a missed animationend (a hidden tab, a browser that skips animations).
const LEAVE_MS = 400;

/** The page's one message slot. Put it once inside each island; it sits above the Finish time sheet by itself. */
export function Toaster() {
  const live = useSyncExternalStore(subscribeToast, getToast, () => null);
  // What is on screen can outlast the store by one exit animation, so it is kept here.
  const [shown, setShown] = useState<ToastState | null>(live);
  const [leaving, setLeaving] = useState(false);

  if (live && live !== shown) {
    setShown(live);
    setLeaving(false);
  } else if (!live && shown && !leaving) {
    setLeaving(true);
  }

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setShown(null), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  return (
    // The live region is always in the page: screen readers only announce text added to one that already exists.
    <div className={styles.host} role="status" aria-live="polite" aria-atomic="true">
      {shown && (
        <Card
          key={shown.id}
          toast={shown}
          leaving={leaving}
          onGone={() => setShown(null)}
          onNow={() => {
            dismissToast();
            setShown(null);
          }}
        />
      )}
    </div>
  );
}

interface CardProps {
  toast: ToastState;
  leaving: boolean;
  onGone: () => void;
  /** Away with no exit animation, for when the person has just acted on it. */
  onNow: () => void;
}

function Card({ toast, leaving, onGone, onNow }: CardProps) {
  const { text, tone = "success", action } = toast;
  const Icon = toast.icon ?? TONE_ICON[tone];
  const duration = toast.duration ?? (action ? TOAST_WITH_ACTION_MS : TOAST_MS);

  const [paused, setPaused] = useState(false);
  const left = useRef(duration);
  const drag = useRef<{ y: number; at: number; dy: number; active: boolean } | null>(null);
  const card = useRef<HTMLDivElement>(null);

  // The clock stops while a pointer rests on the card or focus is inside it, and picks up where it left off.
  useEffect(() => {
    if (paused || leaving) return;
    const startedAt = Date.now();
    const timer = setTimeout(dismissToast, left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - startedAt;
    };
  }, [paused, leaving]);

  function down(event: PointerEvent<HTMLDivElement>) {
    drag.current = { y: event.clientY, at: event.timeStamp, dy: 0, active: false };
    setPaused(true);
  }

  function move(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    const el = card.current;
    if (!current || !el) return;
    const dy = event.clientY - current.y;
    if (!current.active) {
      if (dy < SLOP) return;
      current.active = true;
      el.setPointerCapture(event.pointerId);
      el.setAttribute("data-dragging", "true");
    }
    current.dy = dy;
    // Pulling up meets resistance; only down puts it away.
    el.style.transform = `translateY(${dy < 0 ? dy * 0.15 : dy}px)`;
  }

  function up(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    const el = card.current;
    drag.current = null;
    if (event.pointerType !== "mouse") setPaused(false);
    if (!current?.active || !el) return;
    el.removeAttribute("data-dragging");
    const speed = current.dy / Math.max(1, event.timeStamp - current.at);
    if (current.dy > SWIPE_AT || speed > FLING) {
      // The exit animation carries on from where the finger let go.
      el.style.setProperty("--drag", `${current.dy}px`);
      el.setAttribute("data-swiped", "true");
      dismissToast();
    } else {
      el.style.transform = "";
    }
  }

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: swiping is a pointer shortcut; the timeout and the Undo button serve everyone else
    <div
      ref={card}
      className={styles.card}
      data-tone={tone}
      data-leaving={leaving || undefined}
      onAnimationEnd={(event) => leaving && event.target === event.currentTarget && onGone()}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerEnter={(event) => event.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className={styles.mark}>
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className={styles.text}>{text}</span>
      {action && (
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            action.run();
            onNow();
          }}
        >
          {action.label}
        </button>
      )}
      {action && (
        <span
          className={styles.clock}
          aria-hidden="true"
          style={
            {
              animationDuration: `${duration}ms`,
              animationPlayState: paused ? "paused" : "running",
            } as CSSProperties
          }
        />
      )}
    </div>
  );
}
