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
  /** What the player calls this village ("Main", "Alt"), so two accounts aren't told apart by their tags alone. */
  nickname?: string;
}

export type VillageSummary = Pick<SavedVillage, "tag" | "townHall" | "exportedAt" | "nickname">;

export const NICKNAME_MAX = 20;

/** A nickname as it is kept: spaces tidied, cut to length, and nothing at all when it is empty. */
export function cleanNickname(text: string): string | undefined {
  const tidy = text.replace(/\s+/g, " ").trim().slice(0, NICKNAME_MAX).trim();
  return tidy || undefined;
}

/** What a village is called on screen: its nickname, or its tag until it has one. */
export const villageLabel = (v: { tag: string; nickname?: string }) => v.nickname ?? v.tag;

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
  // A new export of a village the player already named keeps its name.
  const nickname = saved.villages.find((v) => v.tag === account.tag)?.nickname;
  const entry = { ...savedVillage(account, raw, savedAt), ...(nickname && { nickname }) };
  const known = saved.villages.some((v) => v.tag === account.tag);
  return {
    active: account.tag,
    villages: known
      ? saved.villages.map((v) => (v.tag === account.tag ? entry : v))
      : [...saved.villages, entry],
  };
}

/** `saved` with this village's nickname set, or cleared when `text` is empty. */
export function withNickname(saved: SavedVillages, tag: string, text: string): SavedVillages {
  const nickname = cleanNickname(text);
  return {
    ...saved,
    villages: saved.villages.map((v) => {
      if (v.tag !== tag) return v;
      const { nickname: _old, ...rest } = v;
      return nickname ? { ...rest, nickname } : rest;
    }),
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
    (v.townHall === null || typeof v.townHall === "number") &&
    (v.nickname === undefined || typeof v.nickname === "string")
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
