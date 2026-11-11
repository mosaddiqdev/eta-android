import { formatAge } from "../../engine/time";
import type { PlannedUpgrade } from "../../village/plan";
import type { Lane } from "../../village/types";
import { clock, LANE_NAMES } from "./format";

const ORDER: Lane[] = ["builder", "lab", "pet", "bbBuilder", "bbLab"];
const MAX_LINES = 24;

function step(u: PlannedUpgrade) {
  if (u.gearUp) return `gear up, Lv ${u.fromLevel}`;
  if (u.firstBuild) return `new, Lv ${u.toLevel}`;
  return `Lv ${u.fromLevel} to ${u.toLevel}`;
}

/**
 * The running upgrades as a short message to paste into a chat: one line each, grouped by lane, soonest first.
 * "• Cannon (Lv 13 to 14): 2h 14m (Today, 5:26 PM)".
 */
export function shareText(upgrades: PlannedUpgrade[], now: number): string {
  const running = upgrades.filter((u) => !u.likelyDone && u.finishAt > now);
  if (!running.length) return "Nothing is upgrading right now.";

  const lines: string[] = ["My upgrades, soonest first:"];
  let shown = 0;
  for (const lane of ORDER) {
    const inLane = running.filter((u) => u.lane === lane).sort((a, b) => a.finishAt - b.finishAt);
    if (!inLane.length) continue;
    lines.push("", `${LANE_NAMES[lane]}`);
    for (const u of inLane) {
      if (shown === MAX_LINES) break;
      const { day, time } = clock(u.finishAt, now);
      lines.push(`• ${u.name} (${step(u)}): ${formatAge(u.finishAt - now)} (${day}, ${time})`);
      shown += 1;
    }
  }
  if (running.length > shown) lines.push("", `…and ${running.length - shown} more`);
  return lines.join("\n");
}
