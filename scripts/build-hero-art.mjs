// Cuts the three empty-state pictures (src/assets/hero/*.webp) from the game's full-size art.
// Run it by hand when the art changes: `node scripts/build-hero-art.mjs`. The output is committed.
//
// src/assets/icons/ holds 112 px copies for 22 to 32 px marks. The empty state draws the same buildings at
// about 170 px, so on a 3x phone those icons were stretched 4x and looked soft. These are cut from the
// original files (up to 3700 px wide) at roughly three times the size they are shown.

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const HOME = "node_modules/clash-of-clans-data/images/home";

// `soft` is the alpha range that is cleared to nothing and then ramped up to full. The Laboratory and Pet
// House only have a faint antialiasing fringe, so a short ramp is enough. The Builder's Hut carries a wide,
// soft blue glow around its base baked into the picture; the long ramp removes that halo and keeps the
// lightning drawn on the stones, which is fully opaque.
const PICTURES = [
  { name: "lab", from: "army-buildings/laboratory/normal/level-16.png", width: 440, soft: [8, 40] },
  { name: "builder", from: "defenses/builders-hut/normal/level-8.png", width: 540, soft: [60, 150] },
  { name: "pet", from: "army-buildings/pet-house/normal/level-12.png", width: 400, soft: [8, 40] },
];

function smoothstep(low, high, value) {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

await mkdir("src/assets/hero", { recursive: true });

for (const { name, from, width, soft } of PICTURES) {
  const { data, info } = await sharp(join(HOME, from))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let left = info.width;
  let top = info.height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const at = (y * info.width + x) * 4 + 3;
      data[at] = Math.round(data[at] * smoothstep(soft[0], soft[1], data[at]));
      if (data[at] === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  const out = join("src/assets/hero", `${name}.webp`);
  const written = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize({ width, kernel: "lanczos3" })
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(out);
  console.log(`${out}: ${written.width}x${written.height}, ${(written.size / 1024).toFixed(0)} KB`);
}
