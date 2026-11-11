import { useEffect } from "react";

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement);

/**
 * Imports when the player presses Ctrl+V or Cmd+V anywhere on the page. A keyboard paste is the player's own
 * action, so it needs no clipboard permission and still works where a script's clipboard read is blocked.
 */
export function usePasteAnywhere(enabled: boolean, onText: (text: string) => unknown) {
  useEffect(() => {
    if (!enabled) return;
    const listener = (event: ClipboardEvent) => {
      if (isTyping(event.target)) return;
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (!text.trim()) return;
      event.preventDefault();
      onText(text);
    };
    document.addEventListener("paste", listener);
    return () => document.removeEventListener("paste", listener);
  }, [enabled, onText]);
}
