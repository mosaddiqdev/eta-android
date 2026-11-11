// Describes what a game data update changed, as Markdown for a pull request.
//
//   node scripts/data-diff.mjs <before catalog.json> <after catalog.json> [--from 0.19.0 --to 0.20.0]
//
// It reads two src/game/data/catalog.json files, the one built before the package bump and the one after.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const LIST_LIMIT = 30;

/** @param {{ entries: Record<string, { name: string, kind: string, village: string, image: string | null, levels: number[] }> }} before */
export function diffCatalogs(before, after) {
  const diff = { added: [], removed: [], moreLevels: [], timesChanged: [], noPicture: [] };
  for (const [id, entry] of Object.entries(after.entries)) {
    const old = before.entries[id];
    if (!old) {
      diff.added.push(`${entry.name} (${entry.kind}, ${entry.village}, ${entry.levels.length} levels)`);
    } else {
      if (entry.levels.length !== old.levels.length)
        diff.moreLevels.push(`${entry.name}: ${old.levels.length} → ${entry.levels.length} levels`);
      const shared = Math.min(entry.levels.length, old.levels.length);
      if (entry.levels.slice(0, shared).some((seconds, index) => seconds !== old.levels[index]))
        diff.timesChanged.push(entry.name);
    }
    if (!entry.image) diff.noPicture.push(`${entry.name}${old ? "" : " (new)"}`);
  }
  for (const [id, entry] of Object.entries(before.entries)) {
    if (!(id in after.entries)) diff.removed.push(`${entry.name} (${entry.kind}, ${entry.village})`);
  }
  return diff;
}

function section(title, items, note = "") {
  if (!items.length) return "";
  const shown = items.slice(0, LIST_LIMIT).map((item) => `- ${item}`);
  if (items.length > LIST_LIMIT) shown.push(`- …and ${items.length - LIST_LIMIT} more`);
  return `### ${title} (${items.length})\n${note ? `${note}\n` : ""}\n${shown.join("\n")}\n\n`;
}

export function toMarkdown(diff, { from = "?", to = "?" } = {}) {
  const body =
    section(
      "Removed, look at this first",
      diff.removed,
      "The package dropped these. Players with them will show as Unknown.",
    ) +
    section("New items", diff.added) +
    section("New or removed levels", diff.moreLevels) +
    section("Build or research times changed", diff.timesChanged) +
    section(
      "No picture in the package",
      diff.noPicture,
      "These show a placeholder icon until the package adds art.",
    );
  return (
    `Updates \`clash-of-clans-data\` from ${from} to ${to}.\n\n` +
    (body || "No item was added, removed or retimed. The update only changed other data or pictures.\n\n") +
    "Open the deploy preview and check a few upgrades before merging.\n"
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [beforeFile, afterFile, ...flags] = process.argv.slice(2);
  if (!beforeFile || !afterFile) {
    console.error("Usage: node scripts/data-diff.mjs <before.json> <after.json> [--from x --to y]");
    process.exit(1);
  }
  const flag = (name) => flags[flags.indexOf(`--${name}`) + 1];
  const read = (file) => JSON.parse(readFileSync(file, "utf8"));
  process.stdout.write(
    toMarkdown(diffCatalogs(read(beforeFile), read(afterFile)), { from: flag("from"), to: flag("to") }),
  );
}
