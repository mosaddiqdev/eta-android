import { formatAgo, formatClock } from "../../engine/time";
import type { Lane } from "../../village/types";
import { finishParts } from "../finish/format";

export const clock = (unix: number, now: number) => finishParts(unix * 1000, now * 1000);

/** "Tomorrow, 3:12 AM" */
export function when(unix: number, now: number) {
  const { day, time } = clock(unix, now);
  return `${day}, ${time}`;
}

/** "in 4h 12m", or "done" once it has passed. */
export function countdown(unix: number, now: number) {
  const left = unix - now;
  return left > 0 ? `in ${formatClock(left)}` : "done";
}

export const ago = formatAgo;

export const LANE_NAMES: Record<Lane, string> = {
  builder: "Builders",
  lab: "Laboratory",
  pet: "Pet House",
  bbBuilder: "Builder Base",
  bbLab: "Star Laboratory",
};

export const LANE_ONE: Record<Lane, string> = {
  builder: "builder",
  lab: "researcher",
  pet: "pet slot",
  bbBuilder: "builder",
  bbLab: "researcher",
};

/** Maps a lane to the colour group it uses. */
export const laneKind = (lane: Lane) =>
  lane === "builder" ? "builder" : lane === "lab" ? "lab" : lane === "pet" ? "pet" : "bb";

/** Short names for the summary tiles, where space is tight. */
export const TILE_NAMES: Record<Lane, string> = {
  builder: "Builders",
  lab: "Lab",
  pet: "Pets",
  bbBuilder: "Builder Base",
  bbLab: "Star Lab",
};

/** "12:10 PM" becomes the clock and its period, so the gutter can stack them. 24-hour times have no period. */
export function splitTime(time: string) {
  const match = /^(.*?)[\s\u202f\u00a0]*([ap]\.?m\.?)$/i.exec(time.trim());
  return match
    ? { clock: match[1], period: match[2].replace(/\./g, "").toUpperCase() }
    : { clock: time, period: "" };
}
