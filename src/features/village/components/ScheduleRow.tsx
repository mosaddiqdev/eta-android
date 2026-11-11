import { CircleCheck, HandHelping, Hourglass, type LucideIcon, TimerReset, Zap } from "lucide-react";
import { ITEMS } from "../../../engine/items";
import { artUrl } from "../../../game/art";
import { artKey, avatarKey } from "../../../game/images";
import type { EventKind, PlanEvent, PlannedUpgrade } from "../../../village/plan";
import type { Account } from "../../../village/types";
import { LANE_NAMES, laneKind } from "../format";
import { levelTag } from "../schedule";
import { ArtImage } from "./ArtImage";
import { Countdown } from "./Countdown";
import styles from "./ScheduleRow.module.css";

const ICONS: Record<EventKind, LucideIcon> = {
  finish: CircleCheck,
  boostEnds: Zap,
  helperReady: HandHelping,
  helperEnds: Hourglass,
  towerReady: TimerReset,
};

const VERBS: Record<EventKind, string> = {
  finish: "Finishes",
  boostEnds: "Runs out",
  helperReady: "Ready again",
  helperEnds: "Stops helping",
  towerReady: "Ready again",
};

const SIZE = 36;

interface Props {
  event: PlanEvent;
  upgrade?: PlannedUpgrade;
  /** The clock time, e.g. "5:57 PM". */
  time: string;
  /** Happens in the same minute as the row before it, so the time isn't said twice. */
  same: boolean;
  /** Within the hour, so the countdown is shown stronger. */
  soon: boolean;
  helpers: Account["helpers"];
  clockTower: Account["clockTower"];
}

/** One thing that will happen: its picture on the rail, what it is, when, and how long until then. */
export function ScheduleRow({ event, upgrade, time, same, soon, helpers, clockTower }: Props) {
  const tag = event.kind === "finish" && upgrade ? levelTag(upgrade) : null;
  // The picture and its tint already say which worker it is. Words are added only where they would otherwise be lost:
  // which upgrade a helper leaves, and that the Builder Base is a different village.
  const where =
    event.kind === "helperEnds" && upgrade
      ? `on ${upgrade.name}`
      : event.lane === "bbBuilder" || event.lane === "bbLab"
        ? LANE_NAMES[event.lane]
        : null;

  return (
    <li className={styles.row} data-kind={laneKind(event.lane)} data-event={event.kind}>
      <span className={styles.node}>
        <span className={styles.tile}>{art(event, upgrade, helpers, clockTower)}</span>
      </span>
      <span className={styles.body}>
        <strong className={styles.title}>
          <span>{event.label}</span>
          {tag && <em className={styles.tag}>{tag}</em>}
        </strong>
        <small className={styles.meta}>
          <span className={styles.when}>
            {VERBS[event.kind]} {same ? "at the same time" : time}
          </span>
          {where && <span className={styles.where}>{where}</span>}
        </small>
      </span>
      <span className={styles.left} data-soon={soon}>
        <Countdown at={event.at} />
      </span>
    </li>
  );
}

/** The picture for a row: the real thing from the game, and an icon only when there is none. */
function art(
  event: PlanEvent,
  upgrade: PlannedUpgrade | undefined,
  helpers: Props["helpers"],
  tower: Props["clockTower"],
) {
  // A finish is the moment the new look appears. Buildings show the picture after the work; a unit's wide
  // full-body picture shrinks to a smudge at this size, so units show their square avatar instead.
  if (event.kind === "finish" && upgrade) {
    return <ArtImage imageKey={avatarKey(upgrade.nextImage, upgrade.kind)} kind={upgrade.kind} size={SIZE} />;
  }
  // The Clock Tower shows the building at the level the player has built, both when it is ready and while it runs.
  if ((event.kind === "towerReady" || (event.kind === "boostEnds" && event.lane === "bbBuilder")) && tower) {
    return <ArtImage imageKey={artKey(tower.image, tower.level)} kind="building" size={SIZE} />;
  }
  // A potion or snack running out shows the potion or snack itself.
  const item = event.item ? ITEMS.find((i) => i.id === event.item) : undefined;
  if (item) return <img src={artUrl(`items/${item.art}`)} alt="" width={SIZE} height={SIZE} />;
  // Helper events show the helper's own picture, the same one the Boosts tab uses.
  const helper =
    (event.kind === "helperReady" || event.kind === "helperEnds") &&
    (event.lane === "builder" || event.lane === "lab")
      ? helpers[event.lane]?.image
      : null;
  if (helper) return <ArtImage imageKey={helper} kind="unknown" size={SIZE} />;
  const Icon = ICONS[event.kind];
  return <Icon size={20} aria-hidden="true" />;
}
