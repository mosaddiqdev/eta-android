// The launch splash for Android, drawn from brand/mark.svg: the E in its three lanes, sliding into place one after
// another. Android 12 and newer play it in the system's own splash window, from the moment of the tap and off the
// app's threads, so the app starting up behind it can't make it stutter. Older versions show the finished mark standing
// still. Light and dark get their own drawables, in that theme's lane colours. Used by scripts/android-project.mjs.

// The splash icon is a 288dp square. At 2100 units across, the mark comes out about 136dp tall, which keeps all of it
// inside the 192dp circle Android promises never to cut.
const CANVAS = 2100;

// --builder, --lab and --pet in src/styles/tokens.css, top lane first. scripts/android-splash.test.mjs checks they match.
export const LANE_COLORS = {
  dark: ["#4abbe8", "#e660c6", "#e3be68"],
  light: ["#0e7bad", "#a31782", "#916600"],
};

// Top and bottom arrive from the left, the middle from the right, 80 ms apart. Each lane fades in faster than it
// travels so the slide reads as movement and not as a ghost. Android advises under a second for the whole splash.
const SLIDE = 300;
const LANE_MS = 420;
const FADE_MS = 180;
const STAGGER_MS = 80;
export const SPLASH_MS = LANE_MS + 2 * STAGGER_MS;
const FROM = [-SLIDE, SLIDE, -SLIDE];

// Material 3's emphasized decelerate, the same curve the rest of the app's entrances use.
const EASE = `<pathInterpolator
                        android:controlX1="0.05"
                        android:controlY1="0.7"
                        android:controlX2="0.1"
                        android:controlY2="1" />`;
const LINEAR = `<pathInterpolator android:pathData="M0,0 L1,1" />`;

/** The outline of the E, its three lane bands and where to put it on the canvas, read from the logo file. */
export function readMark(svg) {
  const outline = /<path id="e" d="([^"]+)"/.exec(svg)?.[1];
  const bands = [...svg.matchAll(/<rect x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"\/>/g)];
  const box = /viewBox="([^"]+)"/.exec(svg)?.[1].split(" ").map(Number);
  const shift = Number(/translate\((-?[\d.]+) 0\)/.exec(svg)?.[1]);
  if (!outline || bands.length !== 3 || box?.length !== 4 || Number.isNaN(shift))
    throw new Error(
      "brand/mark.svg no longer has the outline, three lane rectangles, viewBox and shift the splash needs.",
    );
  return {
    outline,
    bands: bands.map(([, x, y, width, height]) => ({ x, y, width, height })),
    // The outline is drawn upside down (the font's y runs up). These centre the viewBox on the canvas, and the
    // drawable flips it with scaleY.
    x: shift + (CANVAS - box[2]) / 2,
    y: (CANVAS - box[3]) / 2 - box[1],
  };
}

const pad = (text, spaces) =>
  text
    .split("\n")
    .map((line) => (line ? " ".repeat(spaces) + line : line))
    .join("\n");

const clip = ({ x, y, width, height }) => `M${x},${y}h${width}v${height}h-${width}z`;

const lane = (mark, index, color, hidden) => `<group android:name="lane_${index}">
    <group
        android:translateX="${mark.x}"
        android:translateY="${mark.y}"
        android:scaleY="-1">
        <clip-path android:pathData="${clip(mark.bands[index])}" />
        <path
            android:name="fill_${index}"
            android:fillColor="${color}"${hidden ? '\n            android:fillAlpha="0"' : ""}
            android:pathData="${mark.outline}" />
    </group>
</group>`;

/** The mark on its canvas. With `hidden` every lane starts see-through, the state the animation plays from. */
const vector = (mark, colors, hidden) => `<vector
    android:width="288dp"
    android:height="288dp"
    android:viewportWidth="${CANVAS}"
    android:viewportHeight="${CANVAS}">
    <group
        android:name="mark"
        android:pivotX="${CANVAS / 2}"
        android:pivotY="${CANVAS / 2}">
${colors.map((color, index) => pad(lane(mark, index, color, hidden), 8)).join("\n")}
    </group>
</vector>`;

const target = (
  name,
  property,
  from,
  to,
  duration,
  offset,
  interpolator,
) => `    <target android:name="${name}">
        <aapt:attr name="android:animation">
            <objectAnimator
                android:duration="${duration}"
                android:propertyName="${property}"
                android:startOffset="${offset}"
                android:valueFrom="${from}"
                android:valueTo="${to}"
                android:valueType="floatType">
                <aapt:attr name="android:interpolator">
                    ${interpolator}
                </aapt:attr>
            </objectAnimator>
        </aapt:attr>
    </target>`;

const still = (mark, colors) => `<?xml version="1.0" encoding="utf-8"?>
<!-- The ClashETA E, standing still. Android 11 and older show this on launch; newer versions play the one in drawable-v31. -->
${vector(mark, colors, false).replace("<vector", '<vector xmlns:android="http://schemas.android.com/apk/res/android"')}
`;

const animated = (mark, colors) => `<?xml version="1.0" encoding="utf-8"?>
<!-- Android 12 and newer play this on launch, about ${SPLASH_MS} ms: the lanes of the E slide in one after another while the
     whole mark settles in from 94%. It stays as the finished mark until the page is ready (MainActivity). Generated by
     scripts/android-splash.mjs from brand/mark.svg. -->
<animated-vector xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:aapt="http://schemas.android.com/aapt">
    <aapt:attr name="android:drawable">
${pad(vector(mark, colors, true), 8)}
    </aapt:attr>
${colors
  .flatMap((_, index) => [
    target(`lane_${index}`, "translateX", FROM[index], 0, LANE_MS, index * STAGGER_MS, EASE),
    target(`fill_${index}`, "fillAlpha", 0, 1, FADE_MS, index * STAGGER_MS, LINEAR),
  ])
  .concat(
    target("mark", "scaleX", 0.94, 1, SPLASH_MS, 0, EASE),
    target("mark", "scaleY", 0.94, 1, SPLASH_MS, 0, EASE),
  )
  .join("\n")}
</animated-vector>
`;

/** Every drawable the splash needs, as paths under res/ and their contents. Light is the default, dark is -night. */
export function splashDrawables(svg) {
  const mark = readMark(svg);
  return Object.entries({ light: "", dark: "-night" }).flatMap(([scheme, night]) => [
    { file: `drawable${night}/eta_splash_icon.xml`, xml: still(mark, LANE_COLORS[scheme]) },
    { file: `drawable${night}-v31/eta_splash_icon.xml`, xml: animated(mark, LANE_COLORS[scheme]) },
  ]);
}
