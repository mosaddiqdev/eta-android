import { Clipboard } from "@capacitor/clipboard";
import { Capacitor } from "@capacitor/core";

// Inside the app the system clipboard goes through the plugin: a WebView does not promise the page a clipboard read.
// In a browser (npm run dev) the page's own clipboard is used, so nothing here changes how the web version behaves.

/** False where a button can't read the clipboard at all, so the caller offers a text box instead. */
export const canReadClipboard = () => Capacitor.isNativePlatform() || Boolean(navigator.clipboard?.readText);

/** Throws when the read is refused, the same as navigator.clipboard.readText does. */
export async function readClipboard(): Promise<string> {
  if (Capacitor.isNativePlatform()) return (await Clipboard.read()).value ?? "";
  return navigator.clipboard.readText();
}

export async function copyText(text: string): Promise<void> {
  if (Capacitor.isNativePlatform()) return Clipboard.write({ string: text });
  return navigator.clipboard.writeText(text);
}
