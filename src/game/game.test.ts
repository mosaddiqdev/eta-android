import { describe, expect, it } from "vitest";
import electroDragonSource from "../../node_modules/clash-of-clans-data/data/home/troops/electro-dragon.json";
import { gameCatalog } from "./catalog";
import raw from "./data/catalog.json";
import manifest from "./data/image-manifest.json";
import { artKey, imageUrl, townHallImage } from "./images";

describe("catalog", () => {
  it("maps ids to names and level times", () => {
    expect(gameCatalog.get(1000013)).toMatchObject({ name: "Mortar", kind: "building", village: "home" });
    // New levels get added, so only a floor.
    expect(gameCatalog.get(1000013)?.levels.length).toBeGreaterThanOrEqual(20);
    expect(gameCatalog.get(73000008)?.name).toBe("Diggy");
    expect(gameCatalog.get(4000132)?.name).toBe("Thrower");
  });

  // Levels are the time to reach each level, so level 1 costs nothing. Checked against the package's own
  // file rather than a number, because balance updates change build times.
  it("stores the time to reach each level", () => {
    const source = electroDragonSource as {
      levels: { researchTime?: { days: number; hours: number; minutes: number; seconds: number } }[];
    };
    const seconds = (t?: { days: number; hours: number; minutes: number; seconds: number }) =>
      t ? t.days * 86400 + t.hours * 3600 + t.minutes * 60 + t.seconds : 0;
    const electroDragon = gameCatalog.get(4000059)?.levels;
    expect(electroDragon?.[0]).toBe(0);
    expect(electroDragon).toEqual(source.levels.map((level) => seconds(level.researchTime)));
  });

  it("knows the helpers", () => {
    expect(gameCatalog.helper(93000000)?.levels[7]).toEqual({ seconds: 3600, multiplier: 8 });
  });
});

const newestTownHall = Math.max(
  ...Object.keys(manifest)
    .filter((key) => key.startsWith("building-home/town_hall@"))
    .map((key) => Number(key.split("@")[1])),
);

describe("per-level pictures", () => {
  it("picks the picture of the exact level", () => {
    expect(artKey("building-home/cannon", 12)).toBe("building-home/cannon@12");
    expect(artKey("building-home/cannon", 1)).toBe("building-home/cannon@1");
  });

  it("shows the nearest older picture for a level the art doesn't cover", () => {
    expect(artKey("building-home/town_hall", 99)).toBe(`building-home/town_hall@${newestTownHall}`);
  });

  it("shows the oldest picture for a level older than all art", () => {
    expect(artKey("building-home/cannon", 0)).toBe("building-home/cannon@1");
  });

  it("returns null for unknown items", () => {
    expect(artKey(null, 3)).toBeNull();
    expect(artKey("building-home/nobody", 3)).toBeNull();
  });

  it("only points the catalog at pictures that exist", () => {
    const entries = Object.values(raw.entries) as { name: string; image?: string; gearUpImage?: string }[];
    for (const entry of entries) {
      if (entry.image) expect(imageUrl(entry.image), entry.name).not.toBeNull();
      if (entry.gearUpImage) expect(imageUrl(entry.gearUpImage), entry.name).not.toBeNull();
    }
  });
});

describe("town hall pictures", () => {
  it("picks the picture for the exact level", () => {
    expect(townHallImage(10)).toBe("building-home/town_hall@10");
  });

  it("falls back to the newest picture for a level the art doesn't cover yet", () => {
    expect(townHallImage(99)).toBe(`building-home/town_hall@${newestTownHall}`);
  });

  it("has no picture when the export had no Town Hall", () => {
    expect(townHallImage(null)).toBeNull();
    expect(townHallImage(0)).toBeNull();
  });
});
