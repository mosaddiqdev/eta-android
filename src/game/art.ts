/*
 * The site's own pictures: the potions, tab icons and helper cut-outs, the three buildings on the import screen and the two
 * game screenshots in the guide. They live in src/assets, so the build gives every file a name with its content
 * hash (/_astro/builder.4f2a9c1e.webp). A name only ever points at one picture, so a file is never stale.
 * Changing a picture changes its name.
 */
import { preloadUrlsWhenIdle } from "./preload";

const files = import.meta.glob<string>("../assets/**/*.webp", {
  eager: true,
  query: "?url",
  import: "default",
});

const urls = new Map<string, string>();
for (const [path, url] of Object.entries(files)) {
  urls.set(path.slice("../assets/".length, -".webp".length), url);
}

/** The hashed URL of `items/builder_potion`, `icons/lab`, `hero/pet` or `guide/data-export`. */
export function artUrl(name: string): string {
  const url = urls.get(name);
  if (!url) throw new Error(`No picture named "${name}" in src/assets`);
  return url;
}

/** Fetch and decode these in the background, so a tab or a screen that shows them later has them already. */
export function preloadArtWhenIdle(names: string[]) {
  preloadUrlsWhenIdle(names.map(artUrl));
}

/*
 * How large an item's picture can be drawn inside a round frame, as a share of the frame's width. The art is
 * a cut-out that fills its whole box, so at full size its corners poke out of a circle. Each number is the
 * size at which the farthest opaque pixel lands 0.46 of the frame's width from the centre, which leaves a
 * small margin inside the 0.5 edge. Measure again when a picture changes.
 */
export const ART_FIT: Record<string, number> = {
  "items/builder_bite": 0.8,
  "items/builder_potion": 0.93,
  "items/pet_potion": 0.93,
  "items/research_potion": 0.93,
  "items/study_soup": 0.83,
  // Not an item: the Builder Base Clock Tower, drawn in the round frame of a row's speed pill.
  "about/clock_tower": 0.92,
};

export function artFit(name: string): number {
  const fit = ART_FIT[name];
  if (!fit) throw new Error(`No fit measured for "${name}"; add it to ART_FIT`);
  return fit;
}
