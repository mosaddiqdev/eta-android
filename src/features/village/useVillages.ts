import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Catalog } from "../../game/catalog";
import { canReadClipboard, readClipboard } from "../../native/clipboard";
import { toast } from "../../ui/toast";
import { ExportError, parseExport } from "../../village/parse";
import { loadSample } from "../../village/sample";
import type { Account, ParseWarning } from "../../village/types";
import { COPY } from "./copy";
import {
  noVillages,
  readVillages,
  type SavedVillage,
  type SavedVillages,
  savedVillage,
  type VillageSummary,
  writeVillages,
} from "./villages";

interface Loaded {
  account: Account;
  warnings: ParseWarning[];
  savedAt: number;
}

export type Status = "loading" | "empty" | "ready";
/** "update" refreshes whatever village is pasted. "add" is for a second village, so the one already open doesn't count. */
export type ImportIntent = "update" | "add";
/** "blocked": the browser or the player refused the read. "unsupported": this browser has no clipboard read at all. */
export type ImportOutcome = "imported" | "same" | "invalid" | "blocked" | "unsupported";

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** The villages a player has pasted: which are saved, which is open, and every way to change that. */
export function useVillages(resetScenario: () => void) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saved, setSaved] = useState<SavedVillages>(noVillages);
  const [booted, setBooted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const catalogPromise = useRef<Promise<Catalog> | null>(null);
  // Callbacks run after awaits, so they read the latest saved list and open village from refs, not stale closures.
  const savedRef = useRef(saved);
  const openTag = useRef<string | null>(null);

  // The catalog is ~40 KB of data the Finish time page never needs, so it loads only here.
  const getCatalog = useCallback(() => {
    catalogPromise.current ??= import("../../game/catalog").then((m) => {
      setCatalog(m.gameCatalog);
      return m.gameCatalog;
    });
    return catalogPromise.current;
  }, []);

  const commit = useCallback((next: SavedVillages) => {
    savedRef.current = next;
    setSaved(next);
    writeVillages(next);
  }, []);

  const show = useCallback(
    (account: Account, warnings: ParseWarning[], savedAt: number) => {
      openTag.current = account.tag;
      setLoaded({ account, warnings, savedAt });
      resetScenario();
      setError(null);
    },
    [resetScenario],
  );

  /** Opens `tag`, dropping any saved village that can no longer be read and trying the next one. */
  const open = useCallback(
    async (tag: string | undefined) => {
      const game = await getCatalog();
      let villages = savedRef.current.villages;
      let target = tag;
      while (target) {
        const entry = villages.find((v) => v.tag === target);
        if (!entry) break;
        try {
          const { account, warnings } = parseExport(entry.raw, game);
          show(account, warnings, entry.savedAt);
          commit({ active: entry.tag, villages });
          return true;
        } catch {
          villages = villages.filter((v) => v !== entry);
          target = villages[0]?.tag;
          setError(COPY.savedUnreadable);
        }
      }
      commit({ active: null, villages });
      return false;
    },
    [commit, getCatalog, show],
  );

  const accept = useCallback(
    async (input: unknown, raw: string | null, intent: ImportIntent = "update"): Promise<ImportOutcome> => {
      const game = await getCatalog();
      let account: Account;
      let warnings: ParseWarning[];
      try {
        ({ account, warnings } = parseExport(input, game));
      } catch (problem) {
        setError(problem instanceof ExportError ? problem.message : COPY.unreadable);
        return "invalid";
      }
      // Asking for "another" village while the open one is still on the clipboard means the other isn't copied yet.
      if (intent === "add" && account.tag === openTag.current) return "same";

      const wasOpen = openTag.current;
      const { villages } = savedRef.current;
      const known = villages.some((v) => v.tag === account.tag);
      const savedAt = nowSeconds();
      if (raw) {
        const entry = savedVillage(account, raw, savedAt);
        commit({
          active: account.tag,
          villages: known ? villages.map((v) => (v.tag === account.tag ? entry : v)) : [...villages, entry],
        });
      }
      show(account, warnings, savedAt);
      if (!known) toast(`Added ${account.tag}`);
      else if (account.tag !== wasOpen) toast(`Switched to ${account.tag}`, { tone: "neutral" });
      return "imported";
    },
    [commit, getCatalog, show],
  );

  useEffect(() => {
    const stored = readVillages();
    savedRef.current = stored;
    setSaved(stored);
    void (async () => {
      if (stored.villages.length) await open(stored.active ?? stored.villages[0].tag);
      else void getCatalog();
      setBooted(true);
    })();
  }, [getCatalog, open]);

  const importText = useCallback(
    (text: string) => accept(text, text).then((o) => o === "imported"),
    [accept],
  );

  /** Reads the clipboard. "blocked" and "unsupported" mean the caller should offer a text box instead. */
  const importClipboard = useCallback(
    async (intent: ImportIntent = "update"): Promise<ImportOutcome> => {
      // No permissions.query pre-check: Safari and Firefox don't answer it here, so the read is the test.
      if (!canReadClipboard()) return "unsupported";
      let text: string;
      try {
        text = await readClipboard();
      } catch {
        // Declined, blocked by policy and an unfocused page throw the same error, so they can't be told apart.
        return "blocked";
      }
      if (!text.trim()) {
        setError(COPY.clipboardEmpty);
        return "invalid";
      }
      return accept(text, text, intent);
    },
    [accept],
  );

  const importSample = useCallback(async () => {
    // Stamped as if it was just copied, so the sample doesn't look months old. It isn't saved.
    await accept(await loadSample(nowSeconds()), null);
  }, [accept]);

  const switchTo = useCallback(
    (tag: string) => {
      if (tag !== openTag.current) void open(tag);
    },
    [open],
  );

  /** Drops the open village and opens the next saved one, if any. Undo puts it back where it was. */
  const forget = useCallback(() => {
    const { villages } = savedRef.current;
    const index = villages.findIndex((v) => v.tag === openTag.current);
    const gone: SavedVillage | undefined = villages[index];
    const rest = villages.filter((v) => v !== gone);
    resetScenario();
    setError(null);
    commit({ active: rest[0]?.tag ?? null, villages: rest });
    if (rest.length) void open(rest[0].tag);
    else {
      openTag.current = null;
      setLoaded(null);
    }
    if (!gone) return;
    toast(`Forgot ${gone.tag}`, {
      tone: "neutral",
      icon: Trash2,
      action: {
        label: "Undo",
        run: () => {
          const current = savedRef.current.villages;
          commit({
            active: gone.tag,
            villages: [...current.slice(0, index), gone, ...current.slice(index)],
          });
          void open(gone.tag);
        },
      },
    });
  }, [commit, open, resetScenario]);

  const villages = useMemo<VillageSummary[]>(() => {
    const list = saved.villages.map(({ tag, townHall, exportedAt }) => ({ tag, townHall, exportedAt }));
    const shown = loaded?.account;
    // The sample village is never saved, but it is open, so the list still has to show it.
    if (shown && !list.some((v) => v.tag === shown.tag)) {
      list.unshift({ tag: shown.tag, townHall: shown.townHall, exportedAt: shown.exportedAt });
    }
    return list;
  }, [saved, loaded]);

  return {
    status: (!booted ? "loading" : loaded ? "ready" : "empty") as Status,
    catalog,
    loaded,
    villages,
    error,
    clearError: () => setError(null),
    importText,
    importClipboard,
    importSample,
    switchTo,
    forget,
  };
}
