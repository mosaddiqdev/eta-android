import { ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { formatClock, formatDuration } from "../../../engine/time";
import { imageUrl } from "../../../game/images";
import { helperOptions } from "../../../village/potion";
import type { Scenario } from "../../../village/scenario";
import type { Account } from "../../../village/types";
import { when } from "../format";
import styles from "./HelperCard.module.css";

interface Props {
  kind: "builder" | "lab";
  account: Account;
  scenario: Scenario;
  now: number;
  /** Opens the upgrade's sheet, where the helper can be tried on it. */
  onOpen: (key: string) => void;
}

export function HelperCard({ kind, account, scenario, now, onOpen }: Props) {
  const helper = account.helpers[kind];
  const { readyAt, options } = useMemo(
    () => helperOptions(account, kind, scenario.now),
    [account, kind, scenario.now],
  );
  if (!helper) return null;

  const working = account.upgrades.find(
    (u) =>
      u.lane === kind &&
      (u.helper?.activeRemaining ?? 0) > 0 &&
      account.exportedAt + (u.helper?.activeRemaining ?? 0) > now,
  );
  const keeps = account.upgrades.find((u) => u.lane === kind && u.helper?.recurrent);
  const best = options[0];
  const art = imageUrl(helper.image);

  // Only the ticking clock is set in fixed-width digits, so the line doesn't shimmer as the seconds change.
  const status = working ? (
    <>
      Working on {working.name},{" "}
      <span className={styles.clock}>
        {formatClock(account.exportedAt + (working.helper?.activeRemaining ?? 0) - now)}
      </span>{" "}
      left
    </>
  ) : readyAt <= now ? (
    "Ready now"
  ) : (
    `Ready ${when(readyAt, now).toLowerCase()}`
  );

  return (
    <article className={styles.card} data-kind={kind}>
      <header>
        {art && <img src={art} alt="" width={40} height={40} draggable={false} />}
        <div>
          <h4>
            {helper.name}
            <span>Lv {helper.level}</span>
            <span className={styles.bonus}>+{helper.bonus}x</span>
          </h4>
          <p>{status}</p>
          {keeps && <p className={styles.keeps}>Keeps helping {keeps.name} every 23h</p>}
        </div>
      </header>
      {!keeps && best && best.savedRecurrent > 0 && (
        <button type="button" className={styles.suggest} onClick={() => onOpen(best.key)}>
          <span>
            <strong>Best use: {best.name}</strong>
            <small>
              Saves {formatDuration(best.savedRecurrent)} if kept assigned, from{" "}
              {when(readyAt, now).toLowerCase()}
            </small>
          </span>
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      )}
    </article>
  );
}
