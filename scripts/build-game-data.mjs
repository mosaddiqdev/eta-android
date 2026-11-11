// Builds the game catalog and the resized pictures from the clash-of-clans-data package.
//
//   npm run data
//
// The package is the only place game data and art come from. The output is generated and not committed:
// `npm run dev`, `npm test` and `npm run build` run this first (skipping the work when nothing changed),
// so a deploy builds it from the version pinned in package-lock.json.
// A new game update is a package version bump, which .github/workflows/update-game-data.yml opens as a PR.
//
//   npm run data                 always rebuild
//   npm run data -- --if-stale   rebuild only when the package version or this script changed
//
// Output: src/game/data/catalog.json, src/game/data/image-manifest.json, public/game/**.webp
//
// Pictures, by manifest key:
//   `group/name`         one fallback picture: a unit's icon, or a building's newest level
//   `group/name@<level>` the picture of that exact level, where the game draws one per level
// A level is its position in the package's `levels` list, not its `level` field: the package mislabels
// a few (Mortar's last two levels say 1 and 2). A level that looks like the one before it points at the
// same file, so identical pictures are encoded and shipped once.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(import.meta.dirname, "..");
const PACKAGE = join(ROOT, "node_modules/clash-of-clans-data");
const IMAGE_SIZE = 128;
const ENCODE_PARALLEL = 8;

// The data has no boost duration for the two speed helpers; every level of both works for one hour.
const HELPER_BOOST_SECONDS = 3600;
const SPEED_HELPERS = ["builders-apprentice", "lab-assistant"];

// What each data folder holds. Every folder of the package's home and builder data must be listed here
// or in IGNORED_FOLDERS: a folder in neither makes the build fail, so a new kind of item the package adds
// is never skipped without anyone noticing.
const KIND_OF_FOLDER = {
  "army-buildings": "building",
  "builder-hall": "building",
  defenses: "building",
  other: "building",
  "resource-buildings": "building",
  "town-hall": "building",
  walls: "building",
  traps: "trap",
  troops: "troop",
  "siege-machines": "troop",
  heroes: "hero",
  pets: "pet",
  spells: "spell",
  guardians: "guardian",
};
const VILLAGE_OF_BASE = { home: "home", builder: "builderBase" };

// Folders that hold no upgrade timer My village shows, or that are read on their own below.
const IGNORED_FOLDERS = {
  "crafted-defenses": "read below: the modules are what upgrades",
  "hero-equipment": "upgraded with resources, not a timer",
  leagues: "not an upgrade",
};

/**
 * When npm says this version was published, for the About card in Settings. Best effort: a build with no network, or
 * npm having a bad moment, must never fail the deploy, so the card just leaves the line out.
 */
async function publishedAt() {
  try {
    const response = await fetch("https://registry.npmjs.org/clash-of-clans-data", {
      signal: AbortSignal.timeout(8000),
    });
    const time = (await response.json()).time?.[version];
    return typeof time === "string" && !Number.isNaN(Date.parse(time)) ? time : null;
  } catch {
    return null;
  }
}

if (!existsSync(PACKAGE)) {
  console.error("clash-of-clans-data isn't installed. Run `npm install` first.");
  process.exit(1);
}
const version = JSON.parse(readFileSync(join(PACKAGE, "package.json"), "utf8")).version;

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

// Output is up to date when it came from this package version and this script.
const OUTPUTS = [
  "src/game/data/catalog.json",
  "src/game/data/image-manifest.json",
  "src/game/data/meta.json",
  "public/game",
];
const STAMP_FILE = join(ROOT, "src/game/data/.stamp");
const stamp = createHash("sha1")
  .update(version)
  .update(readFileSync(import.meta.filename))
  .digest("hex");
if (
  process.argv.includes("--if-stale") &&
  OUTPUTS.every((output) => existsSync(join(ROOT, output))) &&
  existsSync(STAMP_FILE) &&
  readFileSync(STAMP_FILE, "utf8") === stamp
) {
  console.log(`Game data is up to date (clash-of-clans-data@${version}).`);
  process.exit(0);
}
const jsonFilesIn = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => join(dir, f))
    : [];

// Repo folders keep hyphens and apostrophes and drop dots: "P.E.K.K.A" -> pekka.
const slug = (text) =>
  text
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/\./g, "")
    .replace(/[^a-z0-9'-]+/g, "_")
    .replace(/^_|_$/g, "");

const seconds = (t) => (t ? t.days * 86400 + t.hours * 3600 + t.minutes * 60 + t.seconds : 0);

// Level n's time is the time to reach level n (level 1 is 0 for units), which is what the parser
// indexes by the level an upgrade starts from.
const TIME_FIELDS = ["buildTime", "upgradeTime", "researchTime"];
function levelTimes(levels) {
  const field = TIME_FIELDS.find((f) => levels.some((l) => f in l));
  return levels.map((l) => seconds(l[field]));
}

const highestLevel = (dir) => {
  if (!existsSync(dir)) return null;
  const levels = readdirSync(dir)
    .map((f) => /^level-(\d+)\.png$/.exec(f)?.[1])
    .filter(Boolean)
    .map(Number);
  return levels.length ? join(dir, `level-${Math.max(...levels)}.png`) : null;
};

// The fallback picture. A unit, hero, pet or spell has one icon; a building shows its newest level.
function pictureOf(dir) {
  for (const flat of ["icon.png", "normal.png"]) {
    if (existsSync(join(dir, flat))) return join(dir, flat);
  }
  return highestLevel(join(dir, "normal"));
}

// One-item folders (Town Hall, Builder Hall) keep their pictures directly in the folder, and the home
// Wall's pictures are filed with the defenses.
const findPicture = (base, folder, id) =>
  [join(base, folder, id), join(base, folder), join(base, "defenses", id)]
    .map((dir) => pictureOf(join(PACKAGE, "images", dir)))
    .find(Boolean) ?? null;

// A geared-up defense is shown in its active mode: burst, or fast attack for the Archer Tower.
const gearedUpPicture = (base, folder, id) =>
  ["geared-up-burst", "geared-up-fast-attack"]
    .map((mode) => highestLevel(join(PACKAGE, "images", base, folder, id, mode)))
    .find(Boolean) ?? null;

// Picture file of every level, by position (index 0 is level 1). Levels the package has no picture for
// stay out, so a hero, pet or spell (one icon, no per-level art) returns an empty list.
function levelPictures(item, modes) {
  return item.levels.map((level) => {
    for (const mode of modes) {
      const path = level.images?.[mode];
      if (path && existsSync(join(PACKAGE, path))) return join(PACKAGE, path);
    }
    return null;
  });
}
const NORMAL_MODE = ["normal"];
const GEARED_UP_MODES = ["gearedUpBurst", "gearedUpFastAttack"];

const entries = {};
const manifest = {};
const missing = [];
const jobs = [];

function addImage(group, name, file) {
  const key = `${group}/${slug(name)}`;
  if (!(key in manifest)) {
    manifest[key] = null;
    jobs.push({ key, file });
  }
  return key;
}

// Registers `base@1` ... `base@n` for the levels that have a picture of their own.
function addLevelImages(base, pictures) {
  pictures.forEach((file, index) => {
    if (!file) return;
    const key = `${base}@${index + 1}`;
    manifest[key] = null;
    jobs.push({ key, file });
  });
}

function add(id, name, kind, village, levels, file, group, extra = {}, pictures = []) {
  if (id in entries) {
    console.error(`Data id ${id} is used twice: "${entries[id].name}" and "${name}".`);
    process.exit(1);
  }
  const image = file ? addImage(group, name, file) : null;
  if (!file) missing.push(`${kind} ${id} ${name}`);
  if (image) addLevelImages(image, pictures);
  entries[id] = { name, kind, village, image, levels, ...extra };
}

const unknownFolders = [];
for (const base of Object.keys(VILLAGE_OF_BASE)) {
  for (const folder of readdirSync(join(PACKAGE, "data", base))) {
    if (!(folder in KIND_OF_FOLDER) && !(folder in IGNORED_FOLDERS)) unknownFolders.push(`${base}/${folder}`);
  }
}
if (unknownFolders.length) {
  console.error(
    `clash-of-clans-data@${version} has data folders this script doesn't know: ${unknownFolders.join(", ")}.\n` +
      "Add each to KIND_OF_FOLDER (if it holds upgradable items) or IGNORED_FOLDERS in scripts/build-game-data.mjs.",
  );
  process.exit(1);
}

for (const base of Object.keys(VILLAGE_OF_BASE)) {
  const village = VILLAGE_OF_BASE[base];
  for (const [folder, kind] of Object.entries(KIND_OF_FOLDER)) {
    const dataDir = join(PACKAGE, "data", base, folder);
    for (const file of jsonFilesIn(dataDir)) {
      const item = readJson(file);
      if (!Array.isArray(item.levels) || typeof item.dataId !== "number") continue;
      const picture = findPicture(base, folder, item.id);
      const gearedUp = gearedUpPicture(base, folder, item.id);
      const extra = {};
      // How long the gear up itself takes (Cannon, Archer Tower, Mortar). Not the same as a level upgrade.
      if (item.gearUp?.time) extra.gearUpSeconds = seconds(item.gearUp.time);
      if (gearedUp) {
        extra.gearUpImage = addImage(`gearup-${village}`, item.name, gearedUp);
        addLevelImages(extra.gearUpImage, levelPictures(item, GEARED_UP_MODES));
      }
      add(
        item.dataId,
        item.name,
        kind,
        village,
        levelTimes(item.levels),
        picture,
        `${kind}-${village}`,
        extra,
        levelPictures(item, NORMAL_MODE),
      );
    }
  }
}

// Crafting Station modules have their own ids and timers, and are shown under their defense. A module's
// level is not the defense's level, so a module keeps the defense's single newest picture.
for (const file of jsonFilesIn(join(PACKAGE, "data/home/crafted-defenses"))) {
  const defense = readJson(file);
  const picture = pictureOf(join(PACKAGE, "images/home/crafted-defenses", defense.id));
  for (const mod of defense.modules ?? []) {
    if (typeof mod.dataId !== "number") continue;
    add(
      mod.dataId,
      `${defense.name}: ${mod.name}`,
      "building",
      "home",
      levelTimes(mod.upgrades),
      picture,
      "building-crafted",
      { crafting: true },
    );
  }
}

const helpers = SPEED_HELPERS.map((id) => {
  const helper = readJson(join(PACKAGE, "data/home/other/helpers", `${id}.json`));
  const picture = pictureOf(join(PACKAGE, "images/home/other/helpers", id));
  const image = picture ? addImage("helper", helper.name, picture) : null;
  if (!picture) missing.push(`helper ${helper.dataId} ${helper.name}`);
  return {
    id: helper.dataId,
    name: helper.name,
    image,
    // workRate is the helper's level, which is what it adds to the speed.
    levels: helper.levels.map((l) => ({ seconds: HELPER_BOOST_SECONDS, multiplier: l.workRate })),
  };
});

// The Builder Base Clock Tower, shaped like a helper: how long one boost lasts and how much speed it adds
// at each level. The package gives the time a boost gains, so the speed is gained / duration (126 / 14 = 9,
// the extra on top of 1x, which makes it the game's 10x). Its picture is the building's own per-level art.
const clockTowerSource = readJson(join(PACKAGE, "data/builder/other/clock-tower.json"));
const clockTower = {
  id: clockTowerSource.dataId,
  name: clockTowerSource.name,
  image: entries[clockTowerSource.dataId]?.image ?? null,
  levels: clockTowerSource.levels.map((l) => ({
    seconds: l.boostDurationMinutes * 60,
    multiplier: l.timeGainedMinutes / l.boostDurationMinutes,
  })),
};

rmSync(join(ROOT, "public/game"), { recursive: true, force: true });
mkdirSync(join(ROOT, "public/game"), { recursive: true });

// Encode each distinct source picture once, a few at a time; keys that share a source share the file.
const sources = [...new Set(jobs.map((job) => job.file))];
const buffers = new Map();
let cursor = 0;
await Promise.all(
  Array.from({ length: ENCODE_PARALLEL }, async () => {
    while (cursor < sources.length) {
      const file = sources[cursor++];
      buffers.set(
        file,
        await sharp(file)
          .resize(IMAGE_SIZE, IMAGE_SIZE, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toBuffer(),
      );
    }
  }),
);

// Files are named in job order, so a rebuild writes the same names for the same input.
const encoded = new Map();
const byContent = new Map();
let bytes = 0;
for (const { key, file } of jobs) {
  if (!encoded.has(file)) {
    const buffer = buffers.get(file);
    const hash = createHash("sha1").update(buffer).digest("hex").slice(0, 8);
    // The package repeats some pictures under different paths (a level that looks like another item's).
    if (byContent.has(hash)) {
      encoded.set(file, byContent.get(hash));
      manifest[key] = byContent.get(hash);
      continue;
    }
    const [group, name] = key.split("/");
    // `thrower@12` is written as thrower.l12.<hash>.webp; the first key to use a picture names the file.
    const [item, level] = name.split("@");
    const out = join("public/game", group, `${item}${level ? `.l${level}` : ""}.${hash}.webp`);
    mkdirSync(join(ROOT, "public/game", group), { recursive: true });
    writeFileSync(join(ROOT, out), buffer);
    const url = `/${out.replace(/^public\//, "")}`;
    encoded.set(file, url);
    byContent.set(hash, url);
    bytes += buffer.length;
  }
  manifest[key] = encoded.get(file);
}

if (Object.keys(entries).length === 0) {
  console.error("No items were read from the package. Its data layout may have changed.");
  process.exit(1);
}

// Entities point at an image key; two names can share one file.
const dataDir = join(ROOT, "src/game/data");
mkdirSync(dataDir, { recursive: true });
writeFileSync(
  join(dataDir, "catalog.json"),
  JSON.stringify({ source: `clash-of-clans-data@${version}`, entries, helpers, clockTower }),
);
writeFileSync(join(dataDir, "image-manifest.json"), JSON.stringify(manifest));
writeFileSync(
  join(dataDir, "meta.json"),
  JSON.stringify({
    package: "clash-of-clans-data",
    version,
    publishedAt: await publishedAt(),
    builtAt: new Date().toISOString(),
  }),
);
writeFileSync(STAMP_FILE, stamp);

console.log(
  `clash-of-clans-data@${version}: ${Object.keys(entries).length} entities, ${Object.keys(manifest).length} picture keys, ${byContent.size} files, ${(bytes / 1024).toFixed(0)} KB`,
);
if (missing.length) console.log(`no image for ${missing.length}:\n  ${missing.join("\n  ")}`);
