// Turns the logo sources in brand/ into the files browsers and phones ask for, in public/.
// Run `npm run brand` after changing anything in brand/. The outputs are committed, so a deploy doesn't need to.
//
//   favicon.svg               brand/icon-small.svg   (bigger E, wider slits, so it survives 16 px)
//   favicon.ico               16, 32 and 48 px PNGs in one ICO, for old browsers and /favicon.ico requests
//   apple-touch-icon.png      180 px, square (iOS rounds the corners itself)
//   icon-192.png, icon-512.png  rounded tile, for the web app manifest
//   icon-maskable-512.png     square, E inside the safe zone, so Android can crop it to any shape
import { copyFile, readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const brand = new URL("../brand/", import.meta.url);
const pub = new URL("../public/", import.meta.url);

const png = async (source, size, out) => {
  const svg = await readFile(new URL(source, brand));
  const data = await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  if (out) await writeFile(new URL(out, pub), data);
  return data;
};

// An ICO file is a small header, one directory entry per image, then the images. PNG data is allowed inside.
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0);
    entry.writeUInt8(size === 256 ? 0 : size, 1);
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

await copyFile(new URL("icon-small.svg", brand), new URL("favicon.svg", pub));
const sizes = [16, 32, 48];
const frames = await Promise.all(
  sizes.map(async (size) => ({ size, data: await png("icon-small.svg", size) })),
);
await writeFile(new URL("favicon.ico", pub), ico(frames));
await png("icon-flat.svg", 180, "apple-touch-icon.png");
await png("icon.svg", 192, "icon-192.png");
await png("icon.svg", 512, "icon-512.png");
await png("icon-maskable.svg", 512, "icon-maskable-512.png");
console.log("brand assets written to public/");
