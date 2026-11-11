import { initialCounts, itemsFor } from "../../engine/items";
import { boneGroup } from "../../ui/Bone";
import { BoostGrid } from "./controls/BoostGrid";
import { CategoryTabs } from "./controls/CategoryTabs";
import { TimeCard } from "./controls/TimeCard";
import styles from "./FinishIsland.module.css";

const noop = () => {};
const NO_TIME = { days: 0, hours: 0, minutes: 0, seconds: 0 };

/**
 * The Finish time page before its script has run: the page's own controls in their starting state, drawn in
 * skeleton mode (see styles/skeleton.css). They are the real components, so every size matches by construction.
 */
export function FinishSkeleton() {
  return (
    <div
      className={`${boneGroup} ${styles.shell}`}
      data-kind="builder"
      data-skeleton
      aria-hidden="true"
      inert
    >
      <div className={styles.controls}>
        <CategoryTabs value="builder" timeLabel={{ builder: null, lab: null, pet: null }} onChange={noop} />
        <TimeCard value={NO_TIME} enteredAt={0} now={0} onChange={noop} onClear={noop} />
        <BoostGrid
          kind="builder"
          items={itemsFor("builder")}
          counts={initialCounts().builder}
          onChange={noop}
        />
      </div>
    </div>
  );
}
