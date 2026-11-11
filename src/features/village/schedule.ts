import type { PlanEvent } from "../../village/plan";
import type { Upgrade } from "../../village/types";
import { clock } from "./format";

export interface Cluster {
  /** Unix seconds of the first event in the cluster. */
  at: number;
  /** The clock time printed in the gutter, e.g. "12:49 AM". */
  time: string;
  events: PlanEvent[];
}

export interface Day {
  day: string;
  clusters: Cluster[];
}

const LIMIT = 40;

/**
 * Turns the plan's events into days of time-labelled clusters.
 * Events in the same minute share one label, so three boosts ending together read as one moment.
 * Today is always the first day, even when nothing happens in it: the "Now" row lives there.
 */
export function groupSchedule(events: PlanEvent[], now: number): Day[] {
  const today = clock(now, now).day;
  const days: Day[] = [{ day: today, clusters: [] }];

  for (const event of events.slice(0, LIMIT)) {
    const day = clock(event.at, now).day;
    let current = days.at(-1);
    if (current?.day !== day) {
      current = { day, clusters: [] };
      days.push(current);
    }
    const last = current.clusters.at(-1);
    if (last && Math.floor(last.at / 60) === Math.floor(event.at / 60)) last.events.push(event);
    else current.clusters.push({ at: event.at, time: clock(event.at, now).time, events: [event] });
  }
  return days;
}

type Levelled = Pick<Upgrade, "gearUp" | "firstBuild" | "toLevel">;

/** What an upgrade turns into, short enough for a chip: "Lv 15", "Gear up" or "New". */
export function levelTag(u: Levelled) {
  if (u.gearUp) return "Gear up";
  if (u.firstBuild) return "New";
  return `Lv ${u.toLevel}`;
}
