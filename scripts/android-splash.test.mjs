import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LANE_COLORS, readMark, SPLASH_MS, splashDrawables, statusIcon } from "./android-splash.mjs";

const mark = readFileSync(new URL("../brand/mark.svg", import.meta.url), "utf8");
const tokens = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");

/** The three lane colours a block of tokens.css sets, in the order the logo uses them. */
const lanesIn = (block) =>
  ["--builder", "--lab", "--pet"].map((name) => new RegExp(`${name}:\\s*(#[0-9a-f]{6})`).exec(block)?.[1]);

describe("lane colours", () => {
  it("are the ones the app itself paints with", () => {
    const dark = /^:root \{([^}]*)\}/m.exec(tokens)?.[1];
    const light = /:root\[data-theme="light"\] \{([^}]*)\}/.exec(tokens)?.[1];
    expect(LANE_COLORS.dark).toEqual(lanesIn(dark));
    expect(LANE_COLORS.light).toEqual(lanesIn(light));
  });
});

describe("readMark", () => {
  it("puts the E in the middle of the 2100 unit canvas", () => {
    const { x, y, bands } = readMark(mark);
    expect(bands).toHaveLength(3);
    // Half the canvas, less half the viewBox (762 x 992), taking in the logo's own shift of the outline.
    expect(x).toBe(634);
    expect(y).toBe(1511);
  });

  it("says what is missing when the logo changes shape", () => {
    expect(() => readMark("<svg></svg>")).toThrow(/brand\/mark\.svg/);
  });
});

describe("splashDrawables", () => {
  const drawables = splashDrawables(mark);
  const get = (file) => drawables.find((d) => d.file === file)?.xml ?? "";

  it("writes a still and an animated drawable for light and for dark", () => {
    expect(drawables.map((d) => d.file).sort()).toEqual([
      "drawable-night-v31/eta_splash_icon.xml",
      "drawable-night/eta_splash_icon.xml",
      "drawable-v31/eta_splash_icon.xml",
      "drawable/eta_splash_icon.xml",
    ]);
  });

  it("paints each theme's lanes on its own drawable", () => {
    for (const color of LANE_COLORS.light) expect(get("drawable/eta_splash_icon.xml")).toContain(color);
    for (const color of LANE_COLORS.dark)
      expect(get("drawable-night-v31/eta_splash_icon.xml")).toContain(color);
    expect(get("drawable/eta_splash_icon.xml")).not.toContain(LANE_COLORS.dark[0]);
  });

  it("keeps the still mark fully visible, since older Android never plays the animation", () => {
    expect(get("drawable/eta_splash_icon.xml")).not.toContain("fillAlpha");
    expect(get("drawable/eta_splash_icon.xml")).not.toContain("animated-vector");
  });

  it("animates only things the drawable names, and finishes inside the second Android advises", () => {
    for (const file of ["drawable-v31/eta_splash_icon.xml", "drawable-night-v31/eta_splash_icon.xml"]) {
      const xml = get(file);
      const named = new Set([...xml.matchAll(/<(?:group|path)\s+android:name="(\w+)"/g)].map((m) => m[1]));
      const targets = [...xml.matchAll(/<target android:name="(\w+)"/g)].map((m) => m[1]);
      expect(targets.length).toBeGreaterThan(0);
      for (const name of targets) expect(named).toContain(name);

      const ends = [...xml.matchAll(/android:duration="(\d+)"[\s\S]*?android:startOffset="(\d+)"/g)].map(
        (m) => Number(m[1]) + Number(m[2]),
      );
      expect(Math.max(...ends)).toBe(SPLASH_MS);
      expect(SPLASH_MS).toBeLessThanOrEqual(1000);
    }
  });

  it("starts every lane see-through, so the first frame is only the background", () => {
    expect(get("drawable-v31/eta_splash_icon.xml").match(/android:fillAlpha="0"/g)).toHaveLength(3);
  });

  it("opens and closes every element it writes", () => {
    for (const { xml } of drawables) {
      for (const tag of ["group", "vector", "target", "objectAnimator"]) {
        const opened = xml.match(new RegExp(`<${tag}[\\s>]`, "g"))?.length ?? 0;
        const closed = xml.match(new RegExp(`</${tag}>`, "g"))?.length ?? 0;
        expect(opened).toBe(closed);
      }
    }
  });
});

describe("statusIcon", () => {
  it("is one white E, centred on its own square", () => {
    const xml = statusIcon(mark);
    expect(xml).toContain('android:fillColor="#FFFFFF"');
    expect(xml).toContain('android:viewportWidth="1100"');
    // Half the 1100 square less half the 762 wide viewBox, plus the logo's own shift.
    expect(xml).toContain(`android:translateX="${readMark(mark, 1100).x}"`);
    expect(xml).not.toContain("clip-path");
  });
});
