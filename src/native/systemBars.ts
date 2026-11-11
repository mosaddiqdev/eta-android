import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import type { Theme } from "../settings/settings";

// Dark means light icons on a dark bar. "auto" lets the phone's own light or dark setting decide, like the page does.
const STYLE = {
  auto: SystemBarsStyle.Default,
  dark: SystemBarsStyle.Dark,
  light: SystemBarsStyle.Light,
} as const;

/** Keeps the status and navigation bar icons readable on the page's colour, including when a theme is forced. */
export function paintSystemBars(theme: Theme) {
  if (Capacitor.isNativePlatform()) void SystemBars.setStyle({ style: STYLE[theme] }).catch(() => {});
}
