import { useEffect, useRef } from "react";
import {
  autoImportOn,
  CLIPBOARD_CHECK,
  canImportOnOpen,
  looksLikeExport,
  markClip,
  readClipboardSoon,
  seenClip,
} from "../../native/clipboardImport";
import type { QuietOutcome } from "./useVillages";

/**
 * "Import when opened": imports a village the player has just copied, with no paste. Runs when the page is ready and
 * each time the app comes to the front, only when the setting is on, and only for a new export that was not looked at
 * before. Anything else on the clipboard is left alone without a word.
 */
export function useClipboardImport(ready: boolean, importCopied: (text: string) => Promise<QuietOutcome>) {
  const busy = useRef(false);
  const latest = useRef(importCopied);
  latest.current = importCopied;

  useEffect(() => {
    if (!ready || !canImportOnOpen()) return;

    async function run() {
      if (busy.current || !autoImportOn()) return;
      busy.current = true;
      try {
        const text = await readClipboardSoon();
        if (!text || seenClip(text) || !looksLikeExport(text)) return;
        await latest.current(text);
        markClip(text);
      } finally {
        busy.current = false;
      }
    }

    void run();
    window.addEventListener(CLIPBOARD_CHECK, run);
    return () => window.removeEventListener(CLIPBOARD_CHECK, run);
  }, [ready]);
}
