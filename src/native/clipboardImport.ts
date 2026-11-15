import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { getSettings } from "../settings/settings";
import { readClipboard } from "./clipboard";

// Two ways in, both Android only. The app comes to the front and the clipboard holds a new village export: it is
// imported without a paste ("Import when opened" in Settings). Or the "Import village" Quick Settings tile is tapped,
// which always imports and then sends the player back to the game. Android lets only the app in front read the
// clipboard, which is why the app has to open for a moment. Docs: docs/android.md

interface EtaImport {
  take(): Promise<{ requested: boolean }>;
  toast(options: { text: string }): Promise<void>;
}
const EtaImport = registerPlugin<EtaImport>("EtaImport");

/** Sent on `window` whenever the app has come to the front. The village page listens. */
export const CLIPBOARD_CHECK = "clasheta:clipboard-check";
const PENDING = "clasheta.importRequested";
const LAST = "clasheta.lastClip";
const VILLAGE_PAGE = "/village.html";

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

/** True once for each tap on the tile. */
export function takeTileRequest(): boolean {
  try {
    if (sessionStorage.getItem(PENDING) !== "1") return false;
    sessionStorage.removeItem(PENDING);
    return true;
  } catch {
    return false;
  }
}

export const showSystemToast = (text: string) => EtaImport.toast({ text }).catch(() => {});

/** Back to the game, which is the app the player was in. */
export const backToGame = () => App.minimizeApp().catch(() => {});

async function check() {
  const { requested } = await EtaImport.take().catch(() => ({ requested: false }));
  if (requested) {
    try {
      sessionStorage.setItem(PENDING, "1");
    } catch {}
    // The import lives on the village page. Any other page hands over to it, and it picks the request up on arrival.
    if (!location.pathname.endsWith(VILLAGE_PAGE)) return location.replace(VILLAGE_PAGE);
  }
  window.dispatchEvent(new Event(CLIPBOARD_CHECK));
}

/** Called once from startApp(). */
export function watchClipboardImport() {
  void check();
  void App.addListener("appStateChange", ({ isActive }) => {
    if (isActive) void check();
  });
}

export const autoImportOn = () => getSettings().autoImport;
