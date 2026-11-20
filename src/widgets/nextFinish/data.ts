import { laneKind, TILE_NAMES } from "../../features/village/format";
import { artUrl } from "../../game/art";
import { imageUrl } from "../../game/images";
import type { Village } from "../../notifications/compose";
import type { Clock } from "../../settings/settings";
import type { PlannedUpgrade } from "../../village/plan";
import type { Lane } from "../../village/types";

/**
 * What the Next finish widget is sent (scripts/android/widgets/nextfinish/java/NextFinishData.java reads it). Every upgrade
 * still running in every saved village, soonest first, with the words made here. The phone picks the next one, and drops
 * what has finished, each time it draws, so the widget stays right until the next import without the page being open.
 */
export interface NextFinishPayload {
  clock: Clock;
  villages: {
    tag: string;
    /** The kinds of worker, as the village page's summary tiles list them, each with the page's own icon for it. */
    lanes: {
      lane: Lane;
      name: string;
      /** Regular workers, null where the export doesn't say. Goblins are not counted. */
      capacity: number | null;
      /** Path in the app's assets, or null when there is no picture. */
      icon: string | null;
    }[];
    upgrades: {
      /** Unix milliseconds. */
      at: number;
      lane: Lane;
      name: string;
      detail: string;
      /** Path in the app's assets (public/game/...), or null when there is no picture. */
      image: string | null;
      goblin: boolean;
    }[];
  }[];
}

// Enough for weeks of upgrades; the widget only ever needs the first few and the counts per lane.
const MAX_PER_VILLAGE = 40;

/** What the upgrade is doing, in a few words: the level it gets to, or what else is happening. */
export function detailOf(
  u: Pick<PlannedUpgrade, "gearUp" | "firstBuild" | "crafting" | "fromLevel" | "toLevel">,
) {
  if (u.gearUp) return "Gear up";
  if (u.firstBuild) return "New building";
  if (u.crafting) return "Crafting";
  return `Level ${u.fromLevel} → ${u.toLevel}`;
}

const assetPath = (key: string | null) => {
  const url = imageUrl(key);
  return url ? `public${url}` : null;
};

const LANES: Lane[] = ["builder", "lab", "pet", "bbBuilder", "bbLab"];

/** The same picture the village page's LaneIcon shows: our own signage for the home lanes, the game's for the Builder Base. */
function laneIcon(lane: Lane): string | null {
  if (lane === "bbBuilder") return assetPath("building-builderBase/builder_hall");
  if (lane === "bbLab") return assetPath("building-builderBase/star_laboratory");
  try {
    return `public${artUrl(`lane/${laneKind(lane)}`)}`;
  } catch {
    return null;
  }
}

export function nextFinishPayload(villages: Village[], clock: Clock): NextFinishPayload {
  return {
    clock,
    villages: villages.map(({ account, plan }) => ({
      tag: account.tag,
      lanes: LANES.map((lane) => ({
        lane,
        name: TILE_NAMES[lane],
        capacity: account.capacity[lane],
        icon: laneIcon(lane),
      })),
      upgrades: plan.upgrades
        .filter((u) => !u.likelyDone)
        .sort((a, b) => a.finishAt - b.finishAt)
        .slice(0, MAX_PER_VILLAGE)
        .map((u) => ({
          at: u.finishAt * 1000,
          lane: u.lane,
          name: u.name,
          detail: detailOf(u),
          image: assetPath(u.image ?? u.nextImage),
          goblin: u.goblin,
        })),
    })),
  };
}
