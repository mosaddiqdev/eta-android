import { Check } from "lucide-react";
import type { CSSProperties } from "react";
import { formatDuration } from "../../../engine/time";
import { avatarKey } from "../../../game/images";
import { scrollFade } from "../../../ui/scrollFade";
import type { PlannedUpgrade } from "../../../village/plan";
import { clock, laneKind } from "../format";
import { boostersNow, helperNow, levelStep, progressOf, showsGear, speedNow } from "../rows";
import { useJustFinished } from "../useJustFinished";
import { ArtImage } from "./ArtImage";
import { Countdown } from "./Countdown";
import { GearMark } from "./GearMark";
import { GoblinPill } from "./GoblinPill";
import { HelperPill } from "./HelperPill";
import { SpeedPill } from "./SpeedPill";
import styles from "./UpgradeRow.module.css";

interface Props {
  upgrade: PlannedUpgrade;
  exportedAt: number;
  now: number;
  /** Seconds earlier than without the planned changes, or 0. */
  earlier: number;
  /** Picture of this lane's helper (Builder's Apprentice or Lab Assistant), if the village has one. */
  helperArt: string | null;
  onOpen: () => void;
}

export function UpgradeRow({ upgrade: u, exportedAt, now, earlier, helperArt, onOpen }: Props) {
  const progress = u.likelyDone ? 1 : progressOf(u, exportedAt, now);
  const speed = u.likelyDone ? 1 : speedNow(u, exportedAt, now);
  const finish = clock(u.finishAt, now);
  const helper = helperNow(u, exportedAt, now);
  const helperName = laneKind(u.lane) === "lab" ? "Lab Assistant" : "Builder's Apprentice";
  // A row that finishes while it is on screen gets a moment: its tint fades and the mark pops. The last minute turns
  // the countdown warm, so "almost" reads without anyone doing the arithmetic.
  const just = useJustFinished(u.likelyDone || now >= u.finishAt);
  const soon = !u.likelyDone && u.finishAt - now > 0 && u.finishAt - now <= 60;

  return (
    <button
      type="button"
      className={styles.row}
      data-kind={laneKind(u.lane)}
      data-done={u.likelyDone}
      data-just-done={just}
      onClick={onOpen}
    >
      <ArtImage
        imageKey={avatarKey(u.image, u.kind)}
        kind={u.kind}
        size={u.kind === "building" || u.kind === "trap" ? 52 : 48}
        muted={u.firstBuild}
      />
      <span className={styles.body}>
        <span className={styles.top}>
          <span className={styles.name}>
            <span className={styles.nameText}>{u.name}</span>
            {showsGear(u) && <GearMark />}
          </span>
          <span className={styles.left} data-soon={soon}>
            {u.likelyDone ? <Check size={16} aria-label="Probably done" /> : <Countdown at={u.finishAt} />}
          </span>
        </span>
        <span className={styles.mid}>
          <span>{levelStep(u)}</span>
          <span>
            {finish.day}, {finish.time}
          </span>
        </span>
        {progress !== null && (
          // biome-ignore lint/a11y/useSemanticElements: a custom-styled bar; the native <meter> cannot be styled consistently across browsers
          <span
            className={styles.track}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
            aria-label="Progress"
          >
            <span className={styles.fill} style={{ "--p": progress } as CSSProperties} />
          </span>
        )}
        {(u.goblin || speed > 1 || helper || earlier > 0) && (
          <span className={styles.badges} ref={scrollFade}>
            {u.goblin && <GoblinPill researcher={laneKind(u.lane) === "lab"} />}
            {speed > 1 && <SpeedPill speed={speed} boosters={boostersNow(u, exportedAt, now, helperArt)} />}
            {helper && <HelperPill helper={helper} name={helperName} art={helperArt} />}
            {earlier > 0 && <span className={styles.good}>−{formatDuration(earlier)}</span>}
          </span>
        )}
      </span>
    </button>
  );
}
