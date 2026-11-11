import { useMemo } from "react";
import type { Plan } from "../../../village/plan";
import type { Account } from "../../../village/types";
import { clock } from "../format";
import { groupSchedule } from "../schedule";
import { Countdown } from "./Countdown";
import styles from "./Schedule.module.css";
import { ScheduleRow } from "./ScheduleRow";

const HOUR = 3600;

interface Props {
  plan: Plan;
  now: number;
  helpers: Account["helpers"];
  clockTower: Account["clockTower"];
}

/**
 * One timeline: a marker for now, then each day's events down a single rail, with the pictures as its nodes. There is
 * no time column, so the names get the whole width and the same layout fits a phone and the desktop side column.
 */
export function Schedule({ plan, now, helpers, clockTower }: Props) {
  const byKey = new Map(plan.upgrades.map((u) => [u.key, u]));
  // Day labels depend on "now", but only the minute matters for grouping.
  const minute = Math.floor(now / 60);
  // biome-ignore lint/correctness/useExhaustiveDependencies: regrouped once a minute on purpose
  const days = useMemo(() => groupSchedule(plan.events, now), [plan.events, minute]);
  const next = plan.events[0];

  return (
    <ol className={styles.rail}>
      <li className={styles.now}>
        <span className={styles.pin} aria-hidden="true" />
        <p>
          <span>Now</span>
          {next ? (
            <>
              Next change{" "}
              <strong>
                <Countdown at={next.at} />
              </strong>
            </>
          ) : (
            "Nothing is scheduled"
          )}
        </p>
      </li>
      {days.map((day, index) => (
        <li key={day.day} className={styles.day}>
          <h3>{day.day}</h3>
          {day.clusters.length === 0 ? (
            next && index === 0 && <p className={styles.quiet}>Nothing else today.</p>
          ) : (
            <ul>
              {day.clusters.flatMap((cluster) =>
                cluster.events.map((event, i) => {
                  const upgrade = event.key ? byKey.get(event.key) : undefined;
                  return (
                    <ScheduleRow
                      key={`${event.kind}-${event.key ?? event.label}-${event.at}`}
                      event={event}
                      upgrade={upgrade}
                      time={clock(event.at, now).time}
                      same={i > 0}
                      soon={event.at - now <= HOUR}
                      helpers={helpers}
                      clockTower={clockTower}
                    />
                  );
                }),
              )}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}
