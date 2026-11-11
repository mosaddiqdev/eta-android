/**
 * The sample village behind "Or look around with a sample village".
 *
 * `sample-village.json` is written like a real Data Export, for a made-up Town Hall 17 village, and built to show the
 * whole page at once: every lane has work running, something finishes within the hour and something a week out, the
 * builders have one free worker, a defense is being geared up, the helpers and potions are all working, and the
 * Builder Base has its Clock Tower going. Only the parts the app reads are filled in; the rest is empty, like a
 * fresh export.
 *
 * Its timers were set for a village exported SAMPLE_AGE seconds ago, so opening it stamps the export that long ago
 * and the spread of finish times comes out the same every time. The tag is "#SAMPLE": S, A, M and E are not
 * characters the game uses in player tags, so it can never be a real player's tag.
 */
export const SAMPLE_AGE = 240;

export async function loadSample(now: number) {
  const village = (await import("./sample-village.json")).default;
  return { ...village, timestamp: now - SAMPLE_AGE };
}
