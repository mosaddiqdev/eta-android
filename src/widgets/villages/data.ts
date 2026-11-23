import { TILE_NAMES } from "../../features/village/format";
import type { Village } from "../../notifications/compose";
import type { Clock } from "../../settings/settings";
import type { Lane } from "../../village/types";
import { assetPath, detailOf } from "../nextFinish/data";

/**
 * What the Villages widget is sent (scripts/android/widgets/villages/java/VillagesData.java reads it): for each saved
 * village its name, how many workers it has per kind, and its next few upgrades. The phone works out, each time it
 * draws, which of them are still running and who is idle, so the widget stays right between imports.
 */
export interface VillagesPayload {
  clock: Clock;
  villages: {
    tag: string;
    /** What the player calls it, or empty. The widget shows it in place of the tag. */
    name: string;
    /** The kinds of worker at home, where the export says how many there are. Goblins are not counted. */
    lanes: { lane: Lane; name: string; capacity: number }[];
    upgrades: {
      /** Unix milliseconds. */
      at: number;
      lane: Lane;
      name: string;
      detail: string;
      image: string | null;
      goblin: boolean;
    }[];
  }[];
}

// A village has about a dozen workers at most, so this keeps every running upgrade: the phone counts them to tell who is idle.
const MAX_PER_VILLAGE = 40;

const HOME: Lane[] = ["builder", "lab", "pet"];

export function villagesPayload(villages: Village[], clock: Clock): VillagesPayload {
  return {
    clock,
    villages: villages.map(({ account, plan, nickname }) => ({
      tag: account.tag,
      name: nickname ?? "",
      lanes: HOME.flatMap((lane) => {
        const capacity = account.capacity[lane];
        return capacity === null ? [] : [{ lane, name: TILE_NAMES[lane], capacity }];
      }),
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
