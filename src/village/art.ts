import type { CatalogEntry } from "../game/catalog";
import { artKey } from "../game/images";

export interface UpgradeArt {
  /** What the player sees on the village right now. */
  image: string | null;
  /** What it will look like when the work is done. Same as `image` when nothing visible changes. */
  nextImage: string | null;
}

export interface GearState {
  /** The building is geared up, so the village draws its geared-up mode. */
  geared: boolean;
  /** The work being done is the gear up itself. */
  gearUp: boolean;
}

/**
 * Which picture an upgrade shows. The export's `lvl` is the level the thing has completed, so:
 *
 * - Upgrade from level x to y: the village still shows level x until the timer ends (the game draws the
 *   old model under scaffolding), so `image` is level x and `nextImage` is level y.
 * - Geared-up building, level x to y: it is drawn in its geared-up mode before and after, so both
 *   pictures are the geared-up ones.
 * - First build (level 0): nothing is standing yet and the data has no scaffolding art, so both are the
 *   picture of level 1, the thing being built. The UI mutes it so it doesn't read as finished.
 * - Gear up in progress: the level doesn't change. `image` is the normal look it has now and `nextImage`
 *   the geared-up look it is getting.
 * - A level the art doesn't cover (new game update, old package) falls back inside `artKey`.
 */
export function artForUpgrade(
  known: CatalogEntry | undefined,
  fromLevel: number,
  gear: GearState,
): UpgradeArt {
  if (!known) return { image: null, nextImage: null };

  const normal = (level: number) => artKey(known.image, Math.max(level, 1));
  const geared = (level: number) => artKey(known.gearUpImage ?? null, Math.max(level, 1)) ?? normal(level);

  if (gear.gearUp) return { image: normal(fromLevel), nextImage: geared(fromLevel) };

  const look = gear.geared ? geared : normal;
  return { image: look(fromLevel), nextImage: look(fromLevel + 1) };
}
