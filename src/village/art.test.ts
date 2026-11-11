import { describe, expect, it } from "vitest";
import { gameCatalog } from "../game/catalog";
import { imageUrl } from "../game/images";
import { artForUpgrade } from "./art";

const NORMAL = { geared: false, gearUp: false };
const cannon = gameCatalog.get(1000008);
const mortar = gameCatalog.get(1000013);
const thrower = gameCatalog.get(4000132);
const archerQueen = gameCatalog.get(28000001);

describe("artForUpgrade", () => {
  it("shows the level the village has now, and the level it is becoming", () => {
    const art = artForUpgrade(cannon, 12, NORMAL);
    expect(art.image).toBe("building-home/cannon@12");
    expect(art.nextImage).toBe("building-home/cannon@13");
  });

  it("reaches different files for different levels (not the newest for everyone)", () => {
    const early = imageUrl(artForUpgrade(cannon, 2, NORMAL).image);
    const late = imageUrl(artForUpgrade(cannon, 20, NORMAL).image);
    expect(early).not.toBe(late);
  });

  it("shows a first build as the finished level 1 picture", () => {
    const art = artForUpgrade(cannon, 0, NORMAL);
    expect(art.image).toBe("building-home/cannon@1");
    expect(art.nextImage).toBe("building-home/cannon@1");
  });

  it("draws a geared-up building in its geared-up mode before and after a level upgrade", () => {
    const art = artForUpgrade(mortar, 14, { geared: true, gearUp: false });
    expect(art.image).toBe("gearup-home/mortar@14");
    expect(art.nextImage).toBe("gearup-home/mortar@15");
  });

  it("shows the normal look now and the geared-up look after, while it is being geared up", () => {
    const art = artForUpgrade(mortar, 14, { geared: false, gearUp: true });
    expect(art.image).toBe("building-home/mortar@14");
    expect(art.nextImage).toBe("gearup-home/mortar@14");
  });

  it("uses the unit's level sprite in the lab", () => {
    expect(artForUpgrade(thrower, 2, NORMAL).image).toBe("troop-home/thrower@2");
  });

  it("keeps one picture for things drawn once", () => {
    const art = artForUpgrade(archerQueen, 40, NORMAL);
    expect(art.image).toBe(art.nextImage);
    expect(art.image).not.toBeNull();
  });

  it("falls back to the newest picture when the art is older than the data", () => {
    // Mortar has 20 levels of data; the last ones reuse the newest picture.
    const art = artForUpgrade(mortar, 19, NORMAL);
    expect(art.image).not.toBeNull();
    expect(art.nextImage).not.toBeNull();
  });

  it("has no picture for an item the data doesn't know", () => {
    expect(artForUpgrade(undefined, 5, NORMAL)).toEqual({ image: null, nextImage: null });
  });
});
