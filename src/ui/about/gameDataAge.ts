import { gameData } from "../../game/meta";

export const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "today", "6 days ago", "3 months ago": how stale a date is matters more than the date itself. */
export function ago(from: Date, to: Date) {
  const days = Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  return days < 45 ? rtf.format(-days, "day") : rtf.format(-Math.round(days / 30), "month");
}

/**
 * The one-line summary of the game data, for the Credits row in Settings: "v0.19.0 · released 9 days ago". It says
 * when the package was released, not when the site was last built: a deploy resets the build date even when nothing in
 * the data changed, so it says nothing about how fresh the data is. The words match the table in About, which is where
 * the details are (Credits, Game data). Without a release date (the build could not ask npm) it is just the version.
 */
export function gameDataSummary(now: Date) {
  const base = `Game data v${gameData.version}`;
  return gameData.publishedAt ? `${base} · released ${ago(new Date(gameData.publishedAt), now)}` : base;
}
