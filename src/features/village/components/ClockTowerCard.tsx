import { useMemo } from "react";
import { formatClock, formatDuration } from "../../../engine/time";
import { artKey } from "../../../game/images";
import { clockTowerOutlook } from "../../../village/potion";
import type { Scenario } from "../../../village/scenario";
import type { Account } from "../../../village/types";
import { when } from "../format";
import { ArtImage } from "./ArtImage";
import styles from "./HelperCard.module.css";

interface Props {
  account: Account;
  scenario: Scenario;
  now: number;
}

/** The Builder Base Clock Tower. Like a helper it is free and on a cooldown, so it sits in the same family of cards. */
export function ClockTowerCard({ account, scenario, now }: Props) {
  const tower = account.clockTower;
  const { readyAt } = useMemo(() => clockTowerOutlook(account, scenario.now), [account, scenario.now]);
  if (!tower) return null;

  const running = account.exportedAt + account.boosts.clockTower - now;
  // Only the ticking clock is set in fixed-width digits, so the line doesn't shimmer as the seconds change.
  const status =
    running > 0 ? (
      <>
        Running, <span className={styles.clock}>{formatClock(running)}</span> left
      </>
    ) : readyAt <= now ? (
      "Ready now"
    ) : (
      `Ready ${when(readyAt, now).toLowerCase()}`
    );

  return (
    <article className={styles.card} data-kind="bb">
      <header>
        <ArtImage imageKey={artKey(tower.image, tower.level)} kind="building" size={40} />
        <div>
          <h4>
            {tower.name}
            <span>Lv {tower.level}</span>
            <span className={styles.bonus}>
              {tower.bonus + 1}x for {formatDuration(tower.seconds)}
            </span>
          </h4>
          <p>{status}</p>
          <p>Speeds up the Master Builder and the Star Laboratory</p>
        </div>
      </header>
    </article>
  );
}
