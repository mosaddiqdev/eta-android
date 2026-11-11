import type { CSSProperties } from "react";
import { useSettings } from "../../../settings/settings";
import type { LaneSummary, PlannedUpgrade } from "../../../village/plan";
import { LANE_NAMES, laneKind } from "../format";
import { idleSince } from "../idle";
import { useIntro } from "../useIntro";
import { IdleSlot } from "./IdleSlot";
import { LaneIcon } from "./LaneIcon";
import styles from "./LaneSection.module.css";
import { UpgradeRow } from "./UpgradeRow";

interface Props {
  summary: LaneSummary;
  upgrades: PlannedUpgrade[];
  exportedAt: number;
  now: number;
  earlierBy: Record<string, number>;
  /** Picture of the helper that works this lane, if there is one. */
  helperArt: string | null;
  onOpen: (key: string) => void;
}

export function LaneSection({ summary, upgrades, exportedAt, now, earlierBy, helperArt, onOpen }: Props) {
  const { lane, capacity, busy, idle } = summary;
  const idleSlots = Math.min(idle ?? 0, 8);
  const { hideFinished } = useSettings();
  // Rows that are probably done are not counted as busy; the summary already leaves them out.
  const shown = hideFinished ? upgrades.filter((u) => !u.likelyDone) : upgrades;
  const hidden = upgrades.length - shown.length;
  // When each idle slot went idle, for the ones whose upgrade finished since the export. Longest idle first.
  const idleSinceAt = idleSince(
    upgrades.filter((u) => u.likelyDone).map((u) => u.finishAt),
    idleSlots,
  );
  // Rows ease in once, when the lane first shows, not again every time its tab is opened.
  const intro = useIntro();

  return (
    <section
      id={`lane-${lane}`}
      className={styles.lane}
      data-kind={laneKind(lane)}
      aria-label={LANE_NAMES[lane]}
    >
      <header className={styles.head}>
        <h2>
          <LaneIcon lane={lane} size={40} tile />
          {LANE_NAMES[lane]}
        </h2>
        <p>{capacity === null ? `${busy + summary.goblinBusy} busy` : `${busy} of ${capacity} busy`}</p>
      </header>
      <ul className={styles.list} data-intro={intro}>
        {shown.map((u, index) => (
          <li key={u.key} style={{ "--i": index } as CSSProperties}>
            <UpgradeRow
              upgrade={u}
              exportedAt={exportedAt}
              now={now}
              earlier={earlierBy[u.key] ?? 0}
              helperArt={helperArt}
              onOpen={() => onOpen(u.key)}
            />
          </li>
        ))}
        {hidden > 0 && (
          <li className={styles.hidden}>
            {hidden} finished {hidden === 1 ? "upgrade" : "upgrades"} hidden
          </li>
        )}
        {Array.from({ length: idleSlots }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: idle slots carry no data, so their position is their identity
          <li key={`idle-${i}`} style={{ "--i": shown.length + i } as CSSProperties}>
            <IdleSlot
              lane={lane}
              index={i}
              idleFor={idleSinceAt[i] != null ? now - (idleSinceAt[i] ?? now) : null}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
