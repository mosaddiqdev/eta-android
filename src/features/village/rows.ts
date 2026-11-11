import { ITEMS } from "../../engine/items";
import { artFit, artUrl } from "../../game/art";
import type { Booster } from "../../ui/SourceStack";
import type { PlannedUpgrade } from "../../village/plan";
import { helperKindOf } from "../../village/scenario";
import type { Account, Lane } from "../../village/types";
import { remainingAt } from "../../village/windows";
import { laneKind } from "./format";

/** Base-speed work still left on an upgrade right now. */
export function leftNow(upgrade: PlannedUpgrade, exportedAt: number, now: number) {
  return remainingAt(upgrade.projection, upgrade.remaining, now - exportedAt);
}

/** How far along the level step is (0 to 1), or null when the game data doesn't know the total. */
export function progressOf(upgrade: PlannedUpgrade, exportedAt: number, now: number) {
  if (!upgrade.total) return null;
  return Math.min(1, Math.max(0, 1 - leftNow(upgrade, exportedAt, now) / upgrade.total));
}

/** The speed the upgrade is running at this moment. */
export function speedNow(upgrade: PlannedUpgrade, exportedAt: number, now: number) {
  const t = now - exportedAt;
  return upgrade.projection.segments.find((s) => s.start <= t && t < s.end)?.speed ?? 1;
}

export function levelStep(u: PlannedUpgrade) {
  if (u.gearUp) return `Gear up · Lv ${u.fromLevel}`;
  if (u.firstBuild) return `New · Lv ${u.toLevel}`;
  return `Lv ${u.fromLevel} → ${u.toLevel}`;
}

/** Show the gear mark by the name: the building is geared up, or is being geared up now. */
export const showsGear = (u: PlannedUpgrade) => u.geared || u.gearUp;

const HELPER_ART = { builder: "helpers/builders_apprentice", lab: "helpers/lab_assistant" } as const;

/** The same cut-out the About sheet uses, so the building is one picture everywhere. */
const CLOCK_TOWER_ART = "about/clock_tower";

/**
 * The picture of the helper that works a lane (the Builder's Apprentice for builders, the Lab Assistant for the
 * lab), or null when the village doesn't have that helper. These are our own clean cut-outs in src/assets, not the
 * game catalog's 128 px pictures, so they stay sharp at badge size on a 3x phone.
 */
export function helperArtOf(helpers: Account["helpers"], lane: Lane): string | null {
  const kind = helperKindOf(lane);
  return kind && helpers[kind] ? artUrl(HELPER_ART[kind]) : null;
}

export type { Booster };

/**
 * What is speeding an upgrade up at `now`, front to back: the potion, the snack, then the helper. Read from the
 * same boost windows the finish time is computed from, so a planned potion shows up here too. In the Builder Base
 * the only thing that speeds an upgrade up is the Clock Tower, so it stands in the place of the potions there.
 */
export function boostersNow(u: PlannedUpgrade, exportedAt: number, now: number, helperArt: string | null) {
  return boostersAt(u, now - exportedAt, helperArt);
}

/** The same, at `t` seconds after the export. The timeline in the drawer asks this for every stretch. */
export function boostersAt(u: PlannedUpgrade, t: number, helperArt: string | null) {
  const active = new Set(u.windows.filter((w) => w.start <= t && t < w.end).map((w) => w.source));
  const kind = laneKind(u.lane);
  const boosters: Booster[] = [];
  for (const type of ["potion", "snack"] as const) {
    const item =
      active.has(type) && kind !== "bb" ? ITEMS.find((i) => i.type === type && i.works.includes(kind)) : null;
    if (item)
      boosters.push({
        id: item.id,
        label: item.label,
        art: artUrl(`items/${item.art}`),
        fit: artFit(`items/${item.art}`),
      });
  }
  if (active.has("helper") && helperArt) {
    boosters.push({
      id: "helper",
      label: kind === "lab" ? "Lab Assistant" : "Builder's Apprentice",
      art: helperArt,
      fit: null,
    });
  }
  if (active.has("clockTower")) {
    boosters.push({
      id: "clockTower",
      label: "Clock Tower",
      art: artUrl(CLOCK_TOWER_ART),
      fit: artFit(CLOCK_TOWER_ART),
    });
  }
  return boosters;
}

/** How long a helper works each time it is assigned. */
const HELPER_WORK = 3600;

export interface HelperNow {
  /** Working on this upgrade right now. */
  live: boolean;
  /** Seconds of work left while live, 0 otherwise. */
  left: number;
  /** Share of this stretch of work still to go (1 down to 0), for the ring. */
  share: number;
  /** Seconds until the helper next helps this upgrade, when it is not working now and will go again. */
  nextIn: number | null;
  /** Goes again after this stretch. */
  recurrent: boolean;
}

/**
 * The helper's own clock on one upgrade, apart from the speed it adds: how long it keeps working, or when it comes
 * back. Null when it neither works on this upgrade now nor will repeat on it.
 */
export function helperNow(u: PlannedUpgrade, exportedAt: number, now: number): HelperNow | null {
  const t = now - exportedAt;
  const recurrent = !!u.helper?.recurrent;
  const working = u.windows.find((w) => w.source === "helper" && w.start <= t && t < w.end);
  if (working) {
    const left = working.end - t;
    return {
      live: true,
      left,
      share: Math.min(1, left / Math.max(left, HELPER_WORK)),
      nextIn: null,
      recurrent,
    };
  }
  if (!recurrent) return null;
  const next = u.windows.find((w) => w.source === "helper" && w.start > t);
  return { live: false, left: 0, share: 0, nextIn: next ? next.start - t : null, recurrent };
}
