import { TriangleAlert, X } from "lucide-react";
import { confirm } from "../../../ui/haptics";
import { scrollFade } from "../../../ui/scrollFade";
import type { Plan } from "../../../village/plan";
import type { Lane } from "../../../village/types";
import { clock, LANE_NAMES, laneKind, TILE_NAMES } from "../format";
import { nextToFinish } from "../next";
import { showsGear } from "../rows";
import { ArtImage } from "./ArtImage";
import { Countdown } from "./Countdown";
import { GearMark } from "./GearMark";
import { LaneIcon } from "./LaneIcon";
import styles from "./NextUp.module.css";

const idleText = (lane: Lane, count: number) =>
  lane === "builder" ? `${count} ${count === 1 ? "builder" : "builders"} idle` : `${LANE_NAMES[lane]} idle`;

interface Props {
  plan: Plan;
  now: number;
  planning: number;
  onJump: (lane: Lane) => void;
  onReset: () => void;
}

export function NextUp({ plan, now, planning, onJump, onReset }: Props) {
  const next = nextToFinish(plan);
  const idle = plan.insights.filter((i) => i.code === "idle-builders" && i.lane);
  const tiles = plan.lanes.filter((l) => l.capacity !== null || l.busy + l.goblinBusy > 0);

  return (
    <section className={styles.hero} aria-label="Summary">
      {idle.map((i) => (
        <button key={i.lane} type="button" className={styles.idle} onClick={() => i.lane && onJump(i.lane)}>
          <TriangleAlert size={18} aria-hidden="true" />
          {idleText(i.lane as Lane, i.detail ?? 1)}
          <span>Start an upgrade</span>
        </button>
      ))}

      {next ? (
        <div className={styles.next} data-kind={laneKind(next.lane)}>
          <ArtImage imageKey={next.image} kind={next.kind} size={64} muted={next.firstBuild} />
          <span className={styles.lane}>
            <LaneIcon lane={next.lane} size={32} tile />
          </span>
          <div className={styles.copy}>
            <p className={styles.label}>Next to finish</p>
            <p className={styles.name}>
              {next.name}
              {showsGear(next) && <GearMark />}
            </p>
            <p className={styles.when}>
              <strong>
                <Countdown at={next.finishAt} />
              </strong>
              <span>
                {clock(next.finishAt, now).day}, {clock(next.finishAt, now).time}
              </span>
            </p>
          </div>
        </div>
      ) : (
        <p className={styles.nothing}>Nothing is upgrading right now.</p>
      )}

      <ul className={styles.tiles} ref={scrollFade}>
        {tiles.map((l) => (
          <li key={l.lane}>
            <button
              type="button"
              className={styles.tile}
              data-kind={laneKind(l.lane)}
              data-idle={!!l.idle}
              onClick={() => onJump(l.lane)}
            >
              <LaneIcon lane={l.lane} size={22} />
              <span className={styles.tileLabel}>{TILE_NAMES[l.lane]}</span>
              <span className={styles.tileValue}>
                {l.capacity === null ? l.busy + l.goblinBusy : `${l.busy}/${l.capacity}`}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {planning > 0 && (
        <p className={styles.planning}>
          Planning {planning} {planning === 1 ? "change" : "changes"}. Times below include them.
          <button
            type="button"
            onClick={() => {
              confirm();
              onReset();
            }}
          >
            <X size={14} aria-hidden="true" />
            Reset
          </button>
        </p>
      )}
    </section>
  );
}
