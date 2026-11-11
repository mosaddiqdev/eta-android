import { SourceStack } from "../../../ui/SourceStack";
import type { Booster } from "../rows";
import styles from "./SpeedPill.module.css";

interface Props {
  speed: number;
  /** What is causing the speed right now, front to back. Empty when no known boost is running (the stretch is bare). */
  boosters: Booster[];
}

/**
 * "28x now", with a stack of round pictures of what makes it: the potion, then the snack, then the helper. Each
 * picture is cut out of the one before it, so they overlap without a hard edge.
 */
export function SpeedPill({ speed, boosters }: Props) {
  return (
    <span className={styles.pill} data-bare={boosters.length === 0 || undefined}>
      <SourceStack boosters={boosters} />
      <span>{speed}x</span>
      <span className={styles.soft}>now</span>
      {boosters.length > 0 && <span className="sr-only">from {boosters.map((b) => b.label).join(", ")}</span>}
    </span>
  );
}
