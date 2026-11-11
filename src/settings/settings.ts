import { useSyncExternalStore } from "react";
import { paintSystemBars } from "../native/systemBars";

export type Theme = "auto" | "dark" | "light";
export type Clock = "auto" | "12" | "24";
export type StartOn = "auto" | "finish" | "village";

export interface Settings {
  theme: Theme;
  /** How clock times are written: the device's own habit, or forced to 12 or 24 hours. */
  clock: Clock;
  /** Which page the home address opens: Auto is My village once a village is saved, Finish time before that. */
  startOn: StartOn;
  /** Leave rows that are probably done out of the Workers lists. */
  hideFinished: boolean;
  /** A tiny buzz on taps of steppers, switches and tabs, on phones that can. */
  haptics: boolean;
}

// pages/index.astro reads this key and `startOn` in the page head before first paint, so keep the names in step.
export const SETTINGS_KEY = "clasheta.settings";
export const DEFAULT_SETTINGS: Settings = {
  theme: "auto",
  clock: "auto",
  startOn: "auto",
  hideFinished: false,
  haptics: true,
};

const THEMES: readonly Theme[] = ["auto", "dark", "light"];
const CLOCKS: readonly Clock[] = ["auto", "12", "24"];
const STARTS: readonly StartOn[] = ["auto", "finish", "village"];

/** Reads whatever was stored. Old, edited or half-written values fall back one field at a time, never all at once. */
export function parseSettings(raw: unknown): Settings {
  const value = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  return {
    theme: THEMES.find((t) => t === value.theme) ?? DEFAULT_SETTINGS.theme,
    clock: CLOCKS.find((c) => c === value.clock) ?? DEFAULT_SETTINGS.clock,
    startOn: STARTS.find((s) => s === value.startOn) ?? DEFAULT_SETTINGS.startOn,
    hideFinished: value.hideFinished === true,
    // On unless it was turned off, so an old saved value without the field keeps the default.
    haptics: value.haptics !== false,
  };
}

// Storage throws in some private-browsing modes, so a setting that isn't remembered still works for this visit.
function read(): Settings {
  try {
    return parseSettings(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null"));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** The address bar color a forced theme paints; "auto" restores what the page shipped with. Keep in step with tokens.css. */
const BAR_COLOR = { dark: "#121212", light: "#ededec" } as const;

/**
 * Puts the theme on the page. The inline script in Base.astro does the same thing before first paint, so keep the
 * two in step.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "auto") delete root.dataset.theme;
  else root.dataset.theme = theme;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.dataset.auto ??= meta.content;
    meta.content = theme === "auto" ? meta.dataset.auto : BAR_COLOR[theme];
  }
  paintSystemBars(theme);
}

let current = typeof localStorage === "undefined" ? DEFAULT_SETTINGS : read();
const listeners = new Set<() => void>();

export const getSettings = () => current;

/**
 * Changes the theme as one move, with no animation. Every element has its own colour transition (150ms here, 200ms
 * there, none on some), so letting them run makes the page change theme piece by piece. While the theme changes,
 * colour transitions are switched off (see base.css), so every element takes the new colours in the same frame. Only
 * transforms keep running, so the sliding pill of the control you tapped still glides.
 */
function swapTheme(change: () => void) {
  const root = document.documentElement;
  root.setAttribute("data-theme-switching", "");
  change();
  // Let the page paint once in the new colours with transitions off before they are allowed to run again.
  requestAnimationFrame(() => requestAnimationFrame(() => root.removeAttribute("data-theme-switching")));
}

function publish(next: Settings) {
  const themeChanged = next.theme !== current.theme && typeof document !== "undefined";
  current = next;
  const notify = () => {
    for (const listener of listeners) listener();
  };
  if (!themeChanged) return notify();
  swapTheme(() => {
    applyTheme(next.theme);
    notify();
  });
}

export function updateSettings(patch: Partial<Settings>) {
  const next = parseSettings({ ...current, ...patch });
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {}
  publish(next);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed a setting: follow it, so two open tabs never disagree.
  const onStorage = (event: StorageEvent) => {
    if (event.key === SETTINGS_KEY || event.key === null) publish(read());
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** The settings, live. Server and first client render use the defaults, so hydration always matches. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, () => DEFAULT_SETTINGS);
}
