/*
 * The registry of pictures this page has already fetched and decoded, and the background queue that fills it.
 * It has no data of its own, so any page can use it without loading the game catalog's picture list.
 */
const loaded = new Set<string>();
const inflight = new Map<string, Promise<void>>();
const MAX_PARALLEL = 4;
const queue: (() => void)[] = [];
let running = 0;

export const isLoaded = (url: string) => loaded.has(url);
export const markLoaded = (url: string) => void loaded.add(url);

function next() {
  while (running < MAX_PARALLEL && queue.length) {
    running++;
    queue.shift()?.();
  }
}

/**
 * Fetch and decode in the background, a few at a time. Safe to call repeatedly for the same url.
 * `urgent` is for pictures a screen is waiting on: they go to the front of the queue and are fetched first.
 */
export function preload(url: string, urgent = false): Promise<void> {
  if (loaded.has(url)) return Promise.resolve();
  const existing = inflight.get(url);
  if (existing) return existing;

  const job = new Promise<void>((resolve) => {
    const start = () => {
      const image = new Image();
      image.decoding = "async";
      if (urgent) image.fetchPriority = "high";
      image.src = url;
      image
        .decode()
        .then(() => loaded.add(url))
        .catch(() => {}) // a broken picture should never break the page
        .finally(() => {
          inflight.delete(url);
          running--;
          resolve();
          next();
        });
    };
    if (urgent) queue.unshift(start);
    else queue.push(start);
    next();
  });
  inflight.set(url, job);
  return job;
}

/** Preload known pictures by URL, without competing with first paint. */
export function preloadUrlsWhenIdle(urls: Iterable<string>) {
  const run = () => {
    for (const url of new Set(urls)) void preload(url);
  };
  if ("requestIdleCallback" in window) requestIdleCallback(run, { timeout: 2000 });
  else setTimeout(run, 200);
}
