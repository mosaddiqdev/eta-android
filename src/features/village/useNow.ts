import { useSyncExternalStore } from "react";

// One shared timer, so ten countdowns on a page cost one interval.
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let current = Math.floor(Date.now() / 1000);

const readClock = () => Math.floor(Date.now() / 1000);

function refresh() {
  const next = readClock();
  if (next === current) return;
  current = next;
  for (const notify of listeners) notify();
}

// A hidden tab has its timers slowed to once a minute or stopped, and a phone can freeze the page outright, so the
// tick alone cannot be trusted to bring the clock back. These events fire the moment the page is looked at again.
function resume() {
  if (document.visibilityState === "visible") refresh();
}

export function subscribeNow(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    // The interval stops when nothing is listening, so `current` is as old as the last time anything was.
    // Without this, a screen opened an hour later would show the old time for its first second.
    current = readClock();
    timer = setInterval(refresh, 1000);
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("pageshow", resume);
    window.addEventListener("focus", resume);
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = undefined;
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("pageshow", resume);
      window.removeEventListener("focus", resume);
    }
  };
}

export const readNow = () => current;

/** Unix seconds, ticking once a second. */
export function useNow() {
  return useSyncExternalStore(subscribeNow, readNow, readNow);
}
