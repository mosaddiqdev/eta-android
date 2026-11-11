import type { LucideIcon } from "lucide-react";

/** success: something good happened. neutral: it's done, or here is a hint. warning: needs a look. */
export type ToastTone = "success" | "neutral" | "warning";

export interface ToastOptions {
  tone?: ToastTone;
  /** Replaces the tone's own icon, e.g. a bin for "Forgot". */
  icon?: LucideIcon;
  /** One way back. Pressing it runs `run` and the toast leaves at once. */
  action?: { label: string; run: () => void };
  /** How long it stays, in ms. A toast with an action stays longer, because the person needs time to decide. */
  duration?: number;
}

export interface ToastState extends ToastOptions {
  id: number;
  text: string;
}

export const TOAST_MS = 4500;
export const TOAST_WITH_ACTION_MS = 9000;

// One slot, one voice: a new message replaces the old one instead of piling up behind it. Islands are separate
// React roots, so the slot lives here, outside React, and each Toaster reads it with useSyncExternalStore.
let current: ToastState | null = null;
let counter = 0;
const listeners = new Set<() => void>();

const publish = (next: ToastState | null) => {
  current = next;
  for (const listener of listeners) listener();
};

export function toast(text: string, options: ToastOptions = {}) {
  publish({ id: ++counter, text, ...options });
}

export const dismissToast = () => current && publish(null);

export const getToast = () => current;

export function subscribeToast(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
