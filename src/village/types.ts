import type { CatalogKind } from "../game/catalog";

/** A place where one piece of work happens at a time. Goblin workers add extra places to a lane. */
export type Lane = "builder" | "lab" | "pet" | "bbBuilder" | "bbLab";

export interface HelperState {
  /** Seconds of the helper boost still running, 0 when it isn't helping now. */
  activeRemaining: number;
  /** "Keep assigned until the upgrade is complete". */
  recurrent: boolean;
}

export interface Upgrade {
  /** Stable within one import: `${section}:${id}:${index}`. */
  key: string;
  id: number;
  lane: Lane;
  name: string;
  kind: CatalogKind | "unknown";
  /** Picture of what stands in the village now: the level it has, not the level it is becoming. */
  image: string | null;
  /** Picture after the work finishes; equals `image` for gear ups and first builds. */
  nextImage: string | null;
  /** The building is geared up (it has the lasting `gear_up` state), including while it is being levelled. */
  geared: boolean;
  /** Level 0 → 1: the building isn't standing yet. */
  firstBuild: boolean;
  fromLevel: number;
  /** Same as `fromLevel` for a gear up, which changes the mode and not the level. */
  toLevel: number;
  maxLevel: number | null;
  /** Base-speed seconds left when the export was taken. */
  remaining: number;
  /** Base seconds for this level, when the catalog knows it. Not known for gear ups. */
  total: number | null;
  gearUp: boolean;
  /** Goblin Builder / Goblin Researcher: an extra worker on top of the regular ones. */
  goblin: boolean;
  crafting: boolean;
  helper: HelperState | null;
}

export interface Helper {
  kind: "builder" | "lab";
  name: string;
  image: string | null;
  level: number;
  /** Extra speed the helper adds while it works. */
  bonus: number;
  /** How long one assignment lasts. */
  seconds: number;
}

/** The Builder Base Clock Tower: free, on a cooldown, and it speeds up the Master Builder and the Star Laboratory. */
export interface ClockTower {
  name: string;
  /** Key of the building's picture; the level's own look comes from `artKey`. */
  image: string | null;
  level: number;
  /** Extra speed while it runs (9 is the game's 10x). */
  bonus: number;
  /** How long one boost lasts at this level. */
  seconds: number;
}

export interface Boosts {
  builder: number;
  builderSnack: number;
  lab: number;
  labSnack: number;
  pet: number;
  clockTower: number;
  clockTowerCooldown: number;
}

export interface Account {
  tag: string;
  /** Unix seconds when the game wrote the export. Every duration below is measured from here. */
  exportedAt: number;
  townHall: number | null;
  /** Workers per lane. null where the export doesn't tell us. */
  capacity: Record<Lane, number | null>;
  upgrades: Upgrade[];
  boosts: Boosts;
  helpers: { builder: Helper | null; lab: Helper | null; cooldown: number };
  /** null when the export has no Clock Tower, or the game data doesn't know its level. */
  clockTower: ClockTower | null;
}

export interface ParseWarning {
  code: string;
  message: string;
}

/** Speed added during [start, end), in seconds from the export time. */
export interface Window {
  start: number;
  end: number;
  bonus: number;
  source: "potion" | "snack" | "helper" | "clockTower";
}

export interface Segment {
  start: number;
  end: number;
  speed: number;
}
