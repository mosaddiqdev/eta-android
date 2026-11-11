import { formatDuration } from "../../../engine/time";
import type { HelperPreview as Preview } from "../../../village/potion";
import { when } from "../format";
import styles from "./HelperPreview.module.css";

interface Props {
  preview: Preview;
  /** The helper's own picture (Builder's Apprentice or Lab Assistant). */
  art: string | null;
  trying: boolean;
  now: number;
  onToggle: () => void;
}

/**
 * A what-if switch for the upgrade in the sheet. Nothing is saved: the game is the only place a helper is really
 * assigned, so the sheet shows what the helper would do here and forgets it when it closes.
 */
export function HelperPreview({ preview, art, trying, now, onToggle }: Props) {
  const { helper, readyAt, saved, leaves } = preview;
  const ready = readyAt <= now ? "Ready now" : `Ready ${when(readyAt, now).toLowerCase()}`;

  return (
    <button type="button" role="switch" aria-checked={trying} className={styles.card} onClick={onToggle}>
      {art && <img src={art} alt="" width={44} height={44} draggable={false} />}
      <span className={styles.text}>
        <strong>
          {helper.name}
          <span className={styles.bonus}>+{helper.bonus}x</span>
        </strong>
        {/* Both versions share one grid cell, so the cell is as tall as the taller one in either state. The card never
            changes height when it flips, and nothing around it moves; the two only trade opacity. */}
        <span className={styles.lines}>
          <span className={styles.line} data-on={!trying} aria-hidden={trying}>
            <small>{`See it here. ${ready}.`}</small>
          </span>
          <span className={styles.line} data-on={trying} aria-hidden={!trying}>
            <small className={saved > 0 ? styles.good : undefined}>
              {saved > 0 ? `Finishes ${formatDuration(saved)} sooner if kept assigned` : "No time saved here"}
            </small>
            {leaves && leaves.cost > 0 && (
              <small className={styles.cost}>
                {leaves.name} would finish {formatDuration(leaves.cost)} later
              </small>
            )}
          </span>
        </span>
      </span>
      <span className={styles.track} aria-hidden="true">
        <span />
      </span>
    </button>
  );
}
