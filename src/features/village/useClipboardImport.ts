import { useEffect, useRef } from "react";
import {
  autoImportOn,
  backToGame,
  CLIPBOARD_CHECK,
  canImportOnOpen,
  looksLikeExport,
  markClip,
  readClipboardSoon,
  seenClip,
  showSystemToast,
  takeTileRequest,
} from "../../native/clipboardImport";
import { toast } from "../../ui/toast";
import type { QuietOutcome } from "./useVillages";

/**
 * Imports a village the player has just copied, with no paste. Runs when the page is ready and each time the app comes
 * to the front. Two ways to get here: opening the app (only when "Import when opened" is on, and only for a new export
 * that was not looked at before), or the Quick Settings tile (always, then back to the game).
 */
export function useClipboardImport(ready: boolean, importCopied: (text: string) => Promise<QuietOutcome>) {
  const busy = useRef(false);
  const latest = useRef(importCopied);
  latest.current = importCopied;

  useEffect(() => {
    if (!ready || !canImportOnOpen()) return;

    async function run() {
      const fromTile = takeTileRequest();
      if (busy.current || (!fromTile && !autoImportOn())) return;
      busy.current = true;
      try {
        const text = await readClipboardSoon();
        if (!text) {
          if (fromTile) toast("Nothing copied yet. Copy your village in Clash first.", { tone: "warning" });
          return;
        }
        if (!fromTile && (seenClip(text) || !looksLikeExport(text))) return;
        const outcome = await latest.current(text);
        markClip(text);
        if (!fromTile) return;
        if (outcome === "invalid") {
          toast("That isn’t a village export. In Clash, copy it again.", { tone: "warning" });
          return;
        }
        await showSystemToast(outcome === "same" ? "Already up to date" : "Village imported");
        backToGame();
      } finally {
        busy.current = false;
      }
    }

    void run();
    window.addEventListener(CLIPBOARD_CHECK, run);
    return () => window.removeEventListener(CLIPBOARD_CHECK, run);
  }, [ready]);
}
