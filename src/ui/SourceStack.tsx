import type { CSSProperties } from "react";
import styles from "./SourceStack.module.css";

export interface Booster {
  /** Stable within one upgrade: the item id, or "helper". */
  id: string;
  label: string;
  art: string;
  /** Share of the round frame the picture may fill (see `ART_FIT`); null for a portrait, which fills the frame. */
  fit: number | null;
}

/**
 * Round pictures of what is making an upgrade faster, front to back: the potion, then the snack, then the helper.
 * Each one is cut out of the one behind it so they overlap without a hard edge. The size comes from `--size`.
 */
export function SourceStack({ boosters }: { boosters: Booster[] }) {
  if (boosters.length === 0) return null;
  return (
    <span className={styles.stack} aria-hidden="true">
      {boosters.map((b) => (
        <span key={b.id} className={styles.chip} data-portrait={b.fit === null || undefined}>
          <img
            src={b.art}
            alt=""
            width={28}
            height={28}
            draggable={false}
            decoding="sync"
            style={b.fit === null ? undefined : ({ "--fit": b.fit } as CSSProperties)}
          />
        </span>
      ))}
    </span>
  );
}
