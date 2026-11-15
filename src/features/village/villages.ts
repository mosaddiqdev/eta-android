import type { Account } from "../../village/types";

export const VILLAGES_KEY = "clasheta.villages";

/** Sent on `window` after the saved villages change, so the app can set its notifications to match (native/app.ts). */
export const VILLAGES_CHANGED = "clasheta:villages";

export interface SavedVillage {
  tag: string;
  /** The text the player pasted, so a village can be re-read after the game data changes. */
  raw: string;
  savedAt: number;
  /** Kept beside the export so the village list can draw its picture without parsing every export. */
  townHall: number | null;
  exportedAt: number;
}

export type VillageSummary = Pick<SavedVillage, "tag" | "townHall" | "exportedAt">;

export interface SavedVillages {
  active: string | null;
  villages: SavedVillage[];
}

export const noVillages: SavedVillages = { active: null, villages: [] };

export function savedVillage(account: Account, raw: string, savedAt: number): SavedVillage {
  return { tag: account.tag, raw, savedAt, townHall: account.townHall, exportedAt: account.exportedAt };
}

/** `saved` with this village added, or replaced if it was already there, and opened. */
export function withVillage(
  saved: SavedVillages,
  account: Account,
  raw: string,
  savedAt: number,
): SavedVillages {
  const entry = savedVillage(account, raw, savedAt);
  const known = saved.villages.some((v) => v.tag === account.tag);
  return {
    active: account.tag,
    villages: known
      ? saved.villages.map((v) => (v.tag === account.tag ? entry : v))
      : [...saved.villages, entry],
  };
}

function isSavedVillage(value: unknown): value is SavedVillage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.tag === "string" &&
    typeof v.raw === "string" &&
    typeof v.savedAt === "number" &&
    typeof v.exportedAt === "number" &&
    (v.townHall === null || typeof v.townHall === "number")
  );
}

// Private-browsing modes can make storage throw, and old or edited entries can have the wrong shape.
// A village that isn't remembered is still usable, so none of this is fatal.
export function readVillages(): SavedVillages {
  try {
    const parsed = JSON.parse(localStorage.getItem(VILLAGES_KEY) ?? "null");
    if (!Array.isArray(parsed?.villages)) return noVillages;
    // Keep only entries with the right shape; a hand-edited or half-written one must not reach the parser or the UI.
    const villages = parsed.villages.filter(isSavedVillage);
    const active = typeof parsed.active === "string" ? parsed.active : null;
    return { active, villages };
  } catch {
    return noVillages;
  }
}

export function writeVillages(saved: SavedVillages) {
  try {
    localStorage.setItem(VILLAGES_KEY, JSON.stringify(saved));
  } catch {}
  window.dispatchEvent(new Event(VILLAGES_CHANGED));
}
