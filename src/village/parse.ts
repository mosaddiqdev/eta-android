import type { Catalog } from "../game/catalog";
import { artForUpgrade } from "./art";
import { BUILDER_HUT_IDS, CLOCK_TOWER_ID, COPY_STEPS, HELPER_IDS, TOWN_HALL_ID } from "./constants";
import { isGearUpInProgress } from "./gear";
import type { Account, Boosts, ClockTower, Helper, Lane, ParseWarning, Upgrade } from "./types";

export class ExportError extends Error {}

// Valid JSON that isn't a village: a link, a note, another game's export.
const NOT_AN_EXPORT = `That isn’t a village export. Copy it from ${COPY_STEPS} in the game.`;

type Raw = Record<string, unknown>;

// A real export is well under 1 MB. Anything past this is not one, and parsing it would only freeze the page.
const MAX_EXPORT_CHARS = 5_000_000;
// Player tags are about 10 characters. The tag is shown and used as a storage key, so keep it small.
const MAX_TAG_CHARS = 64;

// Which export section feeds which lane. Heroes and guardians are upgraded by a builder.
const SECTIONS: Record<string, Lane> = {
  buildings: "builder",
  traps: "builder",
  heroes: "builder",
  guardians: "builder",
  units: "lab",
  siege_machines: "lab",
  spells: "lab",
  pets: "pet",
  buildings2: "bbBuilder",
  traps2: "bbBuilder",
  heroes2: "bbBuilder",
  units2: "bbLab",
};

// Export sections that never hold an upgrade timer we plan around.
const OTHER_SECTIONS = new Set([
  "helpers",
  "equipment",
  "decos",
  "decos2",
  "obstacles",
  "obstacles2",
  "house_parts",
  "skins",
  "skins2",
  "sceneries",
  "sceneries2",
]);

const isObject = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

/** Accepts the pasted text (even if it was wrapped in quotes once) or an already parsed object. */
function toObject(input: unknown): Raw {
  let value = input;
  if (typeof value === "string" && value.length > MAX_EXPORT_CHARS) throw new ExportError(NOT_AN_EXPORT);
  for (let pass = 0; pass < 2 && typeof value === "string"; pass++) {
    try {
      value = JSON.parse(value.replace(/^\uFEFF/, "").trim());
    } catch {
      throw new ExportError(
        `That data is incomplete or isn’t from the game. Copy the whole export again from ${COPY_STEPS}.`,
      );
    }
  }
  if (!isObject(value)) throw new ExportError(NOT_AN_EXPORT);
  if (
    typeof value.tag !== "string" ||
    value.tag.length === 0 ||
    value.tag.length > MAX_TAG_CHARS ||
    typeof value.timestamp !== "number" ||
    !Number.isFinite(value.timestamp)
  ) {
    throw new ExportError(NOT_AN_EXPORT);
  }
  return value;
}

function entriesOf(data: Raw, section: string): Raw[] {
  const list = data[section];
  return Array.isArray(list) ? list.filter(isObject) : [];
}

function parseHelpers(data: Raw, catalog: Catalog, warnings: ParseWarning[]) {
  const found: Account["helpers"] = { builder: null, lab: null, cooldown: 0 };
  for (const entry of entriesOf(data, "helpers")) {
    found.cooldown = Math.max(found.cooldown, num(entry.helper_cooldown));
    const kind = entry.data === HELPER_IDS.builder ? "builder" : entry.data === HELPER_IDS.lab ? "lab" : null;
    if (!kind) continue;
    const def = catalog.helper(entry.data as number);
    const level = num(entry.lvl);
    const levelDef = def?.levels[level - 1];
    if (!def || !levelDef) {
      warnings.push({
        code: "helper-unknown",
        message: `The ${kind} helper at level ${level} isn’t in the app’s game data yet, so it’s left out of the plan.`,
      });
      continue;
    }
    const helper: Helper = {
      kind,
      name: def.name,
      image: def.image,
      level,
      bonus: levelDef.multiplier,
      seconds: levelDef.seconds,
    };
    found[kind] = helper;
  }
  return found;
}

function parseBoosts(data: Raw): Boosts {
  const raw = isObject(data.boosts) ? data.boosts : {};
  return {
    builder: num(raw.builder_boost),
    builderSnack: num(raw.builder_consumable),
    lab: num(raw.lab_boost),
    labSnack: num(raw.lab_consumable),
    pet: num(raw.pet_boost),
    clockTower: num(raw.clocktower_boost),
    clockTowerCooldown: num(raw.clocktower_cooldown),
  };
}

/** The Clock Tower stands in the Builder Base list; with several entries the highest level is the real one. */
function parseClockTower(data: Raw, catalog: Catalog, warnings: ParseWarning[]): ClockTower | null {
  const level = entriesOf(data, "buildings2")
    .filter((entry) => entry.data === CLOCK_TOWER_ID)
    .reduce((highest, entry) => Math.max(highest, num(entry.lvl)), 0);
  if (level === 0) return null;
  const def = catalog.clockTower();
  const levelDef = def?.levels[level - 1];
  if (!def || !levelDef) {
    warnings.push({
      code: "clock-tower-unknown",
      message: `Clock Tower level ${level} isn’t in the app’s game data yet, so it’s left out of the plan.`,
    });
    return null;
  }
  return {
    name: def.name,
    image: def.image,
    level,
    bonus: levelDef.multiplier,
    seconds: levelDef.seconds,
  };
}

function countOf(entries: Raw[], ids: number[]) {
  return entries.filter((e) => ids.includes(e.data as number)).reduce((sum, e) => sum + (num(e.cnt) || 1), 0);
}

export function parseExport(
  input: unknown,
  catalog: Catalog,
): { account: Account; warnings: ParseWarning[] } {
  const data = toObject(input);
  const warnings: ParseWarning[] = [];
  // Some tools write milliseconds.
  const stamp = data.timestamp as number;
  const exportedAt = stamp > 1e12 ? Math.floor(stamp / 1000) : stamp;

  const upgrades: Upgrade[] = [];
  const addUpgrade = (
    section: string,
    lane: Lane,
    index: number,
    entry: Raw,
    id: number,
    level: number,
    crafting: boolean,
  ) => {
    const remaining = num(entry.timer);
    if (remaining === 0) return;
    const known = catalog.get(id);
    if (!known)
      warnings.push({
        code: "unknown-id",
        message: `Upgrade ${id} isn’t in the app’s game data yet, so it shows without a name.`,
      });
    // `gear_up` says the building is geared up. A timer on it is usually a level upgrade of that building.
    const flagged = entry.gear_up === 1 || entry.gear_up === true;
    const gearUp = flagged && isGearUpInProgress(remaining, known?.levels[level], known?.gearUpSeconds);
    const hasHelper = "helper_timer" in entry || "helper_recurrent" in entry || "recurrent_helper" in entry;
    const { image, nextImage } = artForUpgrade(known, level, { geared: flagged && !gearUp, gearUp });
    upgrades.push({
      key: `${section}:${id}:${index}`,
      id,
      lane,
      name: known?.name ?? `Unknown #${id}`,
      kind: known?.kind ?? "unknown",
      image,
      nextImage,
      geared: flagged && !gearUp,
      firstBuild: level === 0 && !flagged,
      fromLevel: level,
      toLevel: gearUp ? level : level + 1,
      maxLevel: known?.levels.length ?? null,
      remaining,
      total: gearUp ? (known?.gearUpSeconds ?? null) : (known?.levels[level] ?? null),
      gearUp,
      goblin: entry.extra === true,
      crafting,
      helper: hasHelper
        ? {
            activeRemaining: num(entry.helper_timer),
            recurrent: entry.helper_recurrent === true || entry.recurrent_helper === true,
          }
        : null,
    });
  };

  for (const [section, lane] of Object.entries(SECTIONS)) {
    entriesOf(data, section).forEach((entry, index) => {
      if (typeof entry.data !== "number") return;
      addUpgrade(section, lane, index, entry, entry.data, num(entry.lvl), false);
      // Crafting Station modules carry their own levels and timers.
      const types = Array.isArray(entry.types) ? entry.types.filter(isObject) : [];
      for (const type of types) {
        const modules = Array.isArray(type.modules) ? type.modules.filter(isObject) : [];
        for (const mod of modules) {
          if (typeof mod.data === "number")
            addUpgrade(section, lane, index, mod, mod.data, num(mod.lvl), true);
        }
      }
    });
  }

  // A section we don't read that has something running means the game added a kind of upgrade; say so
  // instead of quietly leaving it out of the plan.
  for (const [section, list] of Object.entries(data)) {
    if (section in SECTIONS || OTHER_SECTIONS.has(section) || !Array.isArray(list)) continue;
    if (list.some((entry) => isObject(entry) && num(entry.timer) > 0)) {
      warnings.push({
        code: "unknown-section",
        message: `Upgrades running under “${section}” aren’t shown, because the app doesn’t read that part of the export yet.`,
      });
    }
  }

  const helpers = parseHelpers(data, catalog, warnings);

  // A helper can only be on one upgrade; keep the one that is working now, then the first.
  for (const kind of ["builder", "lab"] as const) {
    const lane: Lane = kind;
    const withHelper = upgrades.filter((u) => u.lane === lane && u.helper);
    if (withHelper.length && !helpers[kind]) {
      warnings.push({
        code: "helper-missing",
        message: `An upgrade is marked as using the ${kind} helper, but the export has no ${kind} helper, so it’s planned without one.`,
      });
      for (const u of withHelper) u.helper = null;
    } else if (withHelper.length > 1) {
      const keep = withHelper.find((u) => (u.helper?.activeRemaining ?? 0) > 0) ?? withHelper[0];
      warnings.push({
        code: "helper-duplicate",
        message: `More than one upgrade claims the ${kind} helper, so it’s applied to ${keep.name} only.`,
      });
      for (const u of withHelper) if (u !== keep) u.helper = null;
    }
  }
  for (const u of upgrades) {
    if (u.helper && u.lane !== "builder" && u.lane !== "lab") u.helper = null;
  }

  const buildings = entriesOf(data, "buildings");
  const capacity: Account["capacity"] = {
    builder: countOf(buildings, BUILDER_HUT_IDS) || null,
    lab: countOf(buildings, [1000007]) ? 1 : null,
    pet: countOf(buildings, [1000068]) ? 1 : null,
    // Builder Base workers move between villages, so the export can't tell us how many are free.
    bbBuilder: null,
    bbLab: null,
  };
  const busy = upgrades.filter((u) => u.lane === "builder" && !u.goblin).length;
  if (capacity.builder !== null && busy > capacity.builder) {
    warnings.push({
      code: "over-capacity",
      message: `${busy} builder upgrades are running, but the export shows only ${capacity.builder} ${capacity.builder === 1 ? "builder" : "builders"}.`,
    });
  }

  const townHall = buildings.find((e) => e.data === TOWN_HALL_ID);
  return {
    account: {
      tag: data.tag as string,
      exportedAt,
      townHall: townHall ? num(townHall.lvl) || null : null,
      capacity,
      upgrades,
      boosts: parseBoosts(data),
      helpers,
      clockTower: parseClockTower(data, catalog, warnings),
    },
    warnings,
  };
}
