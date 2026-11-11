import { formatClock } from "../../../engine/time";
import { finishParts } from "../format";
import type { Plan } from "../useFinishTime";
import styles from "./Facts.module.css";

export function Facts({ plan, now }: { plan: Plan; now: number }) {
  const without = finishParts(plan.startedAt + plan.remaining * 1000, now);

  return (
    <dl className={styles.facts}>
      <div className={styles.fact}>
        <dt>Time saved</dt>
        <dd className={styles.saved}>{formatClock(plan.result.saved)}</dd>
      </div>
      <div className={styles.fact}>
        <dt>Without boost</dt>
        <dd>
          {without.time}
          <span className={styles.day}>{without.day}</span>
        </dd>
      </div>
    </dl>
  );
}
