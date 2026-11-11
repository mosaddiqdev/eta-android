import { Repeat } from "lucide-react";
import type { CSSProperties } from "react";
import { formatClock, formatDuration } from "../../../engine/time";
import type { HelperNow } from "../rows";
import styles from "./HelperPill.module.css";

interface Props {
  helper: HelperNow;
  name: string;
  art: string | null;
}

/**
 * The helper's own clock. It is the helper's face inside a ring: the ring drains while it works and the time sits
 * beside it. A small repeat mark on the face says it goes again. When it is only waiting to go again the face is
 * dimmed, the ring is empty and the pill says when it comes back.
 */
export function HelperPill({ helper, name, art }: Props) {
  const { live, left, share, nextIn, recurrent } = helper;
  const text = live ? formatClock(left) : nextIn ? `in ${formatClock(nextIn)}` : null;
  return (
    <span className={styles.pill} data-live={live}>
      <span className={styles.face} style={{ "--share": share } as CSSProperties} aria-hidden="true">
        <span className={styles.ring} />
        {art && <img src={art} alt="" width={24} height={24} draggable={false} />}
        {recurrent && (
          <span className={styles.again}>
            <Repeat size={9} strokeWidth={3} />
          </span>
        )}
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{live ? "Helping" : nextIn ? "Ready again" : "Repeats"}</span>
        {text && <span className={styles.time}>{text}</span>}
      </span>
      <span className="sr-only">
        {live
          ? `${name} is helping for ${formatDuration(left)}${recurrent ? " and will repeat" : ""}`
          : `${name} will repeat${nextIn ? ` in ${formatDuration(nextIn)}` : ""}`}
      </span>
    </span>
  );
}
