// Tells the daily update workflow whether the data package has a newer version than the one pinned, and whether
// that version has been out long enough to propose (see COOLDOWN_DAYS).
//
//   node scripts/check-data-version.mjs
//
// Prints current, latest, newer and waiting; inside GitHub Actions it also writes them as step outputs. `newer` is
// true only for a version past its cooldown, so the workflow can act on it as it is.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const PACKAGE = "clash-of-clans-data";

/**
 * A new version is proposed only once it has been published this long. This package sometimes ships a fix a few hours
 * or days after a release (0.18.0 and 0.18.1, 0.19.0 and 0.19.1), so waiting avoids opening a pull request for a
 * version that is about to be replaced. Dependabot's own default is the same three days.
 */
export const COOLDOWN_DAYS = 3;

/** True once `publishedAt` is at least `days` days before `now`. A version with no known date is not held back. */
export function isCooledDown(publishedAt, now, days = COOLDOWN_DAYS) {
  if (!publishedAt) return true;
  const published = new Date(publishedAt).getTime();
  if (Number.isNaN(published)) return true;
  return now.getTime() - published >= days * 86_400_000;
}

/** True when version `a` is newer than `b`. Plain x.y.z versions only; the `latest` tag never has more. */
export function isNewer(a, b) {
  const [x, y] = [a, b].map((version) => version.split(".").map(Number));
  for (let i = 0; i < 3; i++) {
    if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  }
  return false;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const pinned = JSON.parse(readFileSync("package.json", "utf8")).devDependencies?.[PACKAGE];
  if (!/^\d+\.\d+\.\d+$/.test(pinned ?? "")) {
    console.error(`${PACKAGE} must be pinned to an exact version in package.json, found "${pinned}".`);
    process.exit(1);
  }
  const latest = execFileSync("npm", ["view", PACKAGE, "version"], { encoding: "utf8" }).trim();
  const ahead = isNewer(latest, pinned);
  // When npm published it. If npm cannot say, the version is not held back: a failed lookup must not stop updates.
  let publishedAt = null;
  if (ahead) {
    try {
      const times = JSON.parse(
        execFileSync("npm", ["view", PACKAGE, "time", "--json"], { encoding: "utf8" }),
      );
      publishedAt = times[latest] ?? null;
    } catch {}
  }
  const waiting = ahead && !isCooledDown(publishedAt, new Date());
  const newer = ahead && !waiting;
  console.log(
    `pinned ${pinned}, latest ${latest}, newer: ${newer}${waiting ? ` (published ${publishedAt}, waiting ${COOLDOWN_DAYS} days before proposing it)` : ""}`,
  );
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `current=${pinned}\nlatest=${latest}\nnewer=${newer}\nwaiting=${waiting}\n`,
    );
  }
}
