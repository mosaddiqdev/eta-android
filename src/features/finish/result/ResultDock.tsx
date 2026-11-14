import { ChevronUp } from "lucide-react";
import { useRef } from "react";
import { formatClock } from "../../../engine/time";
import { finishParts } from "../format";
import type { Plan } from "../useFinishTime";
import { verdictFor } from "../verdict";
import { EmptyDock } from "./EmptyDock";
import { Facts } from "./Facts";
import { PlanTimeline } from "./PlanTimeline";
import styles from "./ResultDock.module.css";
import { Suggestions } from "./Suggestions";
import { useSheet } from "./useSheet";
import { useTyping } from "./useTyping";
import { VerdictChip } from "./VerdictChip";

interface Props {
  plan: Plan | null;
  now: number;
}

/**
 * One sheet for both states, so going between "no time yet" and a result is a slide and a crossfade
 * rather than one card being removed and another popping in.
 */
export function ResultDock({ plan, now }: Props) {
  // When the time is cleared the result stays mounted (faded out) so it can leave gracefully.
  const lastPlan = useRef<Plan | null>(null);
  if (plan) lastPlan.current = plan;
  const shown = plan ?? lastPlan.current;
  const active = plan !== null;
  const sheet = useSheet(active, shown !== null);
  const typing = useTyping();

  return (
    <>
      <div
        className={styles.scrim}
        data-open={sheet.open && !sheet.desktop}
        onClick={sheet.close}
        aria-hidden="true"
      />
      <section className={styles.dock} aria-label="Result">
        <div
          className={styles.panel}
          ref={sheet.panel}
          data-open={sheet.open}
          data-active={active}
          data-solo={shown === null}
          data-typing={typing}
        >
          <div className={styles.stage}>
            {shown && (
              <div className={styles.live} ref={sheet.live} data-on={active}>
                <LiveDock plan={shown} now={now} sheet={sheet} />
              </div>
            )}
            <div className={styles.empty} ref={sheet.empty} data-on={!active}>
              <EmptyDock />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function LiveDock({ plan, now, sheet }: { plan: Plan; now: number; sheet: ReturnType<typeof useSheet> }) {
  const verdict = verdictFor(plan);
  const { day, time } = finishParts(plan.finishAt, now);
  const secondsToGo = Math.max(0, Math.ceil((plan.finishAt - now) / 1000));

  return (
    <>
      <div className={styles.grab} {...sheet.grab}>
        <span className={styles.grip} aria-hidden="true" />
        <button
          type="button"
          className={styles.head}
          aria-expanded={sheet.open}
          aria-controls="result-details"
          onClick={sheet.onToggleClick}
        >
          <span className={styles.when} aria-live="polite">
            <span className={styles.day}>{day}</span>
            <span className={`${styles.time} display`}>{time}</span>
          </span>
          <span className={styles.togo}>{secondsToGo > 0 ? `in ${formatClock(secondsToGo)}` : "Done"}</span>
          <ChevronUp className={styles.chevron} size={20} aria-hidden="true" />
        </button>
        <div className={styles.extras}>
          <VerdictChip verdict={verdict} />
          <Suggestions verdict={verdict} />
        </div>
      </div>

      <div className={styles.hidden} ref={sheet.hidden} id="result-details" inert={!sheet.open}>
        <div className={styles.details}>
          <PlanTimeline plan={plan} now={now} />
          <Facts plan={plan} now={now} />
        </div>
      </div>
    </>
  );
}
