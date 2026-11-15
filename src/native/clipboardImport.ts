import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { getSettings } from "../settings/settings";
import { readClipboard } from "./clipboard";

// "Import when opened", Android only: the app comes to the front and the clipboard holds a new village export, so it is
// imported without a paste. (The Quick Settings tile has its own page, native/quickImport.ts.) Android lets only the app
// in front read the clipboard, so nothing can watch for a copy while the app is closed. Docs: docs/android.md

/** Sent on `window` whenever the app has come to the front. The village page listens. */
export const CLIPBOARD_CHECK = "clasheta:clipboard-check";
const LAST = "clasheta.lastClip";

/** True when this is the Android app, the only place either way in exists. */
export const canImportOnOpen = () => Capacitor.isNativePlatform();

// FNV-1a. The clipboard text is only compared with itself, so a short fingerprint is enough and nothing private is kept.
export function fingerprint(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return `${text.length}:${(hash >>> 0).toString(36)}`;
}

/** Whether this text was already looked at. Without it a village the player forgot would come back at the next open. */
export function seenClip(text: string) {
  try {
    return localStorage.getItem(LAST) === fingerprint(text);
  } catch {
    return false;
  }
}

export function markClip(text: string) {
  try {
    localStorage.setItem(LAST, fingerprint(text));
  } catch {}
}

/** Exports are JSON objects, so anything else on the clipboard is skipped before it is parsed. */
export const looksLikeExport = (text: string) => text.trimStart().startsWith("{");

/** The app only gets the clipboard once its window has focus, a moment after it comes forward, so a few tries. */
export async function readClipboardSoon(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const text = await readClipboard();
      if (text.trim()) return text;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return "";
}

/** Called once from startApp(). */
export function watchClipboardImport() {
  const check = () => window.dispatchEvent(new Event(CLIPBOARD_CHECK));
  check();
  void App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) check();
  });
}

export const autoImportOn = () => getSettings().autoImport;
