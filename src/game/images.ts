import manifest from "./data/image-manifest.json";
import { preloadUrlsWhenIdle } from "./preload";

// Only the items in the imported account are ever requested, so the other ~200 pictures never leave the server.
// Files are content-hashed (scripts/build-game-data.mjs) and ship inside the app, so they load with no network.
// Pictures decoded on this page are remembered here so a component that re-mounts doesn't fade its picture in a
// second time.

const urls = manifest as Record<string, string | null>;

export function imageUrl(key: string | null): string | null {
  return key ? (urls[key] ?? null) : null;
}

// Manifest keys `group/name@<level>` are pictures of one exact level (see scripts/build-game-data.mjs).
// Indexed once so a lookup is a map read plus a short scan.
const pictureLevels = new Map<string, number[]>();
for (const key of Object.keys(urls)) {
  const at = key.lastIndexOf("@");
  if (at === -1) continue;
  const base = key.slice(0, at);
  const levels = pictureLevels.get(base) ?? [];
  levels.push(Number(key.slice(at + 1)));
  pictureLevels.set(base, levels);
}
for (const levels of pictureLevels.values()) levels.sort((a, b) => a - b);

/**
 * The picture of `base` as it looks at `level`. A level with no picture of its own shows the nearest
 * older one (the game reuses a look until the next change), and a level older than all art shows the
 * oldest. Items drawn once, like heroes, pets and spells, return their only picture.
 */
export function artKey(base: string | null, level: number): string | null {
  if (!base) return null;
  const levels = pictureLevels.get(base);
  if (!levels) return base in urls ? base : null;
  let best = levels[0];
  for (const n of levels) {
    if (n > level) break;
    best = n;
  }
  return `${base}@${best}`;
}

/**
 * The square avatar of a unit, hero, pet or spell (the icon the game shows on its army screen), for places too
 * small for the wide full-body picture. A unit's body picture is `base@level`; its avatar is the bare `base`. Buildings
 * and traps are the other way round (the bare key is their newest level), so they keep the picture they have.
 */
export function avatarKey(key: string | null, kind: string): string | null {
  if (!key || kind === "building" || kind === "trap") return key;
  const base = key.split("@")[0];
  return base in urls ? base : key;
}

// The Town Hall is a building like any other; the village crest just reads its level's picture.
const TOWN_HALL_ART = "building-home/town_hall";

export function townHallImage(level: number | null): string | null {
  return level ? artKey(TOWN_HALL_ART, level) : null;
}

export function preloadWhenIdle(keys: (string | null)[]) {
  preloadUrlsWhenIdle(keys.flatMap((key) => imageUrl(key) ?? []));
}
