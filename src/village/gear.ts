/**
 * Whether a timer on a building the export marks `gear_up` is the gear up itself, and not a normal level
 * upgrade of a building that is already geared up.
 *
 * The flag is a lasting state: geared-up defenses are listed with it and no timer. So a flag plus a timer
 * is usually a geared-up building being levelled, which is by far the common case. The game data can tell
 * the rare other case apart, because a gear up and a level upgrade last for different times and a timer
 * can't run longer than the work it counts down:
 *
 * - it can't be the gear up if it is longer than the gear up takes;
 * - it can't be the level upgrade if it is longer than that level takes, or if there is no next level.
 *
 * It is the gear up only when it fits the gear up and can't be the level upgrade. When it fits both,
 * it is read as the level upgrade.
 */
export function isGearUpInProgress(
  remaining: number,
  nextLevelSeconds: number | undefined,
  gearUpSeconds: number | undefined,
): boolean {
  if (gearUpSeconds === undefined || remaining > gearUpSeconds) return false;
  return nextLevelSeconds === undefined || remaining > nextLevelSeconds;
}
