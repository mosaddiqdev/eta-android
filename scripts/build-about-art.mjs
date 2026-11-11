// Cuts the pictures the About drawer uses beyond the potions and helpers (src/assets/about/*.webp) from the game's
// full-size art. Run it by hand when the art changes: `node scripts/build-about-art.mjs`. The output is committed.
// They are drawn at about 56 px, so 224 px wide is four times that for a 3x phone.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const IMAGES = "node_modules/clash-of-clans-data/images";

const PICTURES = [
  { name: "town_hall", from: "home/town-hall/normal/level-17.png" },
  { name: "clock_tower", from: "builder/other/clock-tower/normal/level-10.png" },
  // The package (checked up to 0.19.1) has no Goblin Builder or Goblin Researcher picture, so the gem stands in for
  // both in the Goblin pill. Replace src/assets/helpers/gem.webp with a real avatar if one ever turns up.
  { name: "gem", dir: "helpers", from: "other/gem.png" },
];

await mkdir("src/assets/about", { recursive: true });
await mkdir("src/assets/helpers", { recursive: true });

for (const { name, from, dir = "about" } of PICTURES) {
  const out = join("src/assets", dir, `${name}.webp`);
  const written = await sharp(join(IMAGES, from))
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 })
    .resize({ width: 224, height: 224, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(out);
  console.log(`${out}: ${written.width}x${written.height}, ${(written.size / 1024).toFixed(0)} KB`);
}
