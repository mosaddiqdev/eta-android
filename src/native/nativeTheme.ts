import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Theme } from "../settings/settings";

const EtaTheme = registerPlugin<{ apply(options: { theme: Theme }): Promise<void> }>("EtaTheme");

/**
 * Tells Android which theme the app is in (Auto, Dark or Light), so the launch splash and the native window follow the
 * app's own setting and not only the phone's. The splash is drawn before any page runs, so Android keeps the choice
 * itself (EtaThemePlugin.java). Called at start and whenever the setting changes.
 */
export function applyNativeTheme(theme: Theme) {
  if (Capacitor.isNativePlatform()) void EtaTheme.apply({ theme }).catch(() => {});
}
