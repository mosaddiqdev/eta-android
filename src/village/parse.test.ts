import { describe, expect, it } from "vitest";
import { snapshotCatalog } from "../test/catalog";
import one from "./fixtures/account-1.json";
import two from "./fixtures/account-2.json";
import { ExportError, parseExport } from "./parse";

const parse = (data: unknown) => parseExport(data, snapshotCatalog);

describe("parseExport: running timers", () => {
  it("never run longer than the upgrade's total time", () => {
    for (const village of [one, two]) {
      for (const upgrade of parse(village).account.upgrades) {
        if (upgrade.total !== null)
          expect(upgrade.remaining, upgrade.name).toBeLessThanOrEqual(upgrade.total);
      }
    }
  });
});

describe("parseExport: account 1", () => {
  const { account, warnings } = parse(one);

  it("reads the basics", () => {
    expect(account.tag).toBe("#TEST1");
    expect(account.townHall).toBe(18);
    expect(warnings).toEqual([]);
  });

  it("finds six builders from the huts and B.O.B", () => {
    expect(account.capacity.builder).toBe(6);
    expect(account.capacity.lab).toBe(1);
    expect(account.capacity.pet).toBe(1);
    expect(account.capacity.bbBuilder).toBeNull();
  });

  it("maps every timer to a name and a lane", () => {
    const names = account.upgrades.map((u) => `${u.lane}:${u.name}`);
    expect(names.filter((n) => n.startsWith("builder:")).sort()).toEqual([
      "builder:Hidden Tesla",
      "builder:Mortar",
      "builder:Mortar",
      "builder:Mortar",
      "builder:Mortar",
      "builder:Wizard Tower",
    ]);
    expect(names).toContain("lab:Thrower");
    expect(names).toContain("pet:Diggy");
    expect(names).toContain("bbBuilder:Giant Cannon");
  });

  it("shows each upgrade at the level the village has, not the newest level", () => {
    const mortars = account.upgrades.filter((u) => u.name === "Mortar" && !u.geared);
    expect(mortars.map((u) => [u.fromLevel, u.image])).toEqual(
      expect.arrayContaining([
        [13, "building-home/mortar@13"],
        [14, "building-home/mortar@14"],
      ]),
    );
    expect(mortars.every((u) => u.nextImage === `building-home/mortar@${u.toLevel}`)).toBe(true);
  });

  it("reads the recurrent helper on the Mortar and the Thrower", () => {
    const recurrent = account.upgrades
      .filter((u) => u.helper?.recurrent)
      .map((u) => u.name)
      .sort();
    expect(recurrent).toEqual(["Mortar", "Thrower"]);
    expect(account.upgrades.every((u) => (u.helper?.activeRemaining ?? 0) === 0)).toBe(true);
  });
});

describe("parseExport: account 2", () => {
  const { account } = parse(two);

  it("sees helpers working right now", () => {
    const monolith = account.upgrades.find((u) => u.name === "Monolith");
    const dragon = account.upgrades.find((u) => u.name === "Electro Dragon");
    expect(monolith?.helper).toEqual({ activeRemaining: 3473, recurrent: false });
    expect(dragon?.helper).toEqual({ activeRemaining: 3514, recurrent: true });
  });

  it("sees the potions that were just used", () => {
    expect(account.boosts).toMatchObject({ builder: 3575, lab: 3580, pet: 3572 });
  });

  it("counts the Pet House upgrade as builder work, not pet research", () => {
    expect(account.upgrades.find((u) => u.name === "Pet House")?.lane).toBe("builder");
    expect(account.upgrades.find((u) => u.name === "Electro Owl")?.lane).toBe("pet");
  });
});

describe("parseExport: bad input", () => {
  it("accepts pasted text and doubly encoded text", () => {
    const text = JSON.stringify(one);
    expect(parse(text).account.tag).toBe("#TEST1");
    expect(parse(JSON.stringify(text)).account.tag).toBe("#TEST1");
    expect(parse(`\uFEFF  ${text}\n`).account.tag).toBe("#TEST1");
  });

  it("explains what is wrong", () => {
    expect(() => parse("not json")).toThrow(ExportError);
    expect(() => parse("[]")).toThrow(/isn.t a village export/);
    expect(() => parse({ buildings: [] })).toThrow(/isn.t a village export/);
  });

  it("refuses a huge paste and an absurd tag", () => {
    expect(() => parse(" ".repeat(5_000_001))).toThrow(ExportError);
    expect(() => parse({ ...one, tag: "#".padEnd(100, "A") })).toThrow(/isn.t a village export/);
  });

  it("warns about unknown ids and keeps the timer", () => {
    const { account, warnings } = parse({
      tag: "#X",
      timestamp: 1,
      buildings: [{ data: 1999999, lvl: 3, timer: 500 }],
    });
    expect(warnings[0].code).toBe("unknown-id");
    expect(account.upgrades[0]).toMatchObject({ name: "Unknown #1999999", remaining: 500, kind: "unknown" });
  });

  it("reads millisecond timestamps", () => {
    expect(parse({ tag: "#X", timestamp: 1_792_820_468_000 }).account.exportedAt).toBe(1_792_820_468);
  });

  it("ignores finished timers and unsupported sections", () => {
    const { account } = parse({
      tag: "#X",
      timestamp: 5,
      buildings: [{ data: 1000013, lvl: 3, timer: 0 }],
      decos: [{ data: 18000001, cnt: 4 }],
    });
    expect(account.upgrades).toEqual([]);
  });

  it("recognises goblin workers", () => {
    const { account } = parse({
      tag: "#X",
      timestamp: 5,
      buildings: [{ data: 1000013, lvl: 3, timer: 900, extra: true }],
    });
    expect(account.upgrades[0].goblin).toBe(true);
  });

  it("keeps one helper per helper kind and says so", () => {
    const { account, warnings } = parse({
      tag: "#X",
      timestamp: 5,
      helpers: [{ data: 93000000, lvl: 8, helper_cooldown: 100 }],
      buildings: [
        { data: 1000013, lvl: 3, timer: 900, helper_recurrent: true },
        { data: 1000013, lvl: 4, timer: 1900, helper_recurrent: true },
      ],
    });
    expect(account.upgrades.filter((u) => u.helper)).toHaveLength(1);
    expect(warnings.some((w) => w.code === "helper-duplicate")).toBe(true);
  });

  it("reads Crafting Station module timers", () => {
    const { account } = parse({
      tag: "#X",
      timestamp: 5,
      buildings: [
        { data: 1000097, types: [{ data: 103000011, modules: [{ data: 102000033, lvl: 1, timer: 4000 }] }] },
      ],
    });
    expect(account.upgrades[0]).toMatchObject({ crafting: true, fromLevel: 1, toLevel: 2, remaining: 4000 });
  });

  it("treats level 0 as a building that is being built for the first time", () => {
    const { account } = parse({
      tag: "#X",
      timestamp: 5,
      buildings: [{ data: 1000013, lvl: 0, timer: 900 }],
    });
    expect(account.upgrades[0]).toMatchObject({
      firstBuild: true,
      fromLevel: 0,
      toLevel: 1,
      image: "building-home/mortar@1",
      nextImage: "building-home/mortar@1",
    });
  });

  it("keeps a Crafting Station module on its defense's single picture", () => {
    const { account } = parse({
      tag: "#X",
      timestamp: 5,
      buildings: [
        { data: 1000097, types: [{ data: 103000011, modules: [{ data: 102000033, lvl: 1, timer: 4000 }] }] },
      ],
    });
    const [module] = account.upgrades;
    expect(module.image).toBe(module.nextImage);
    expect(module.image).not.toContain("@");
  });

  it("warns about a new export section with something running in it", () => {
    const { account, warnings } = parse({
      tag: "#X",
      timestamp: 5,
      buildings: [],
      shiny_things: [{ data: 999000001, lvl: 1, timer: 600 }],
      decos: [{ data: 18000000, lvl: 1, timer: 600 }],
    });
    expect(account.upgrades).toEqual([]);
    expect(warnings.map((w) => w.code)).toEqual(["unknown-section"]);
    expect(warnings[0].message).toContain("shiny_things");
  });

  it("names an item the catalog doesn't know yet and keeps it in the right lane", () => {
    const { account, warnings } = parse({
      tag: "#X",
      timestamp: 5,
      buildings: [{ data: 1999999, lvl: 3, timer: 600 }],
      units: [{ data: 4999999, lvl: 2, timer: 900 }],
    });
    expect(account.upgrades.map((u) => [u.name, u.lane, u.kind, u.remaining])).toEqual([
      ["Unknown #1999999", "builder", "unknown", 600],
      ["Unknown #4999999", "lab", "unknown", 900],
    ]);
    expect(warnings.map((w) => w.code)).toEqual(["unknown-id", "unknown-id"]);
  });

  const { account } = parse(one);

  it("reads a flagged building with a timer as a geared-up building being levelled", () => {
    // Mortar 14 with `gear_up` and 239,390 s left: it fits the 3-day level upgrade, not just the 14-day gear up.
    const mortar = account.upgrades.find((u) => u.name === "Mortar" && u.geared);
    expect(mortar).toMatchObject({
      gearUp: false,
      geared: true,
      fromLevel: 14,
      toLevel: 15,
      total: 3 * 86400,
      image: "gearup-home/mortar@14",
      nextImage: "gearup-home/mortar@15",
    });
  });

  it("reads a gear up that can't be a level upgrade as the gear up", () => {
    // A max-level Cannon has no next level, so a timer on it can only be the 2-day gear up.
    const { account: a } = parse({
      tag: "#X",
      timestamp: 5,
      buildings: [{ data: 1000008, lvl: 21, timer: 100000, gear_up: 1 }],
    });
    expect(a.upgrades[0]).toMatchObject({
      gearUp: true,
      geared: false,
      fromLevel: 21,
      toLevel: 21,
      total: 2 * 86400,
      image: "building-home/cannon@21",
      nextImage: "gearup-home/cannon@21",
    });
  });
});
