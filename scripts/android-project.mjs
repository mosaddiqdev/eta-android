// Builds the Android project in android/ from the built site in dist/. `npm run android` runs it after `npm run build`.
//
// android/ is generated and not committed. `cap add android` writes the template that belongs to the installed
// Capacitor version, so it can't fall behind the plugins, and this script puts the few app-specific changes on top.
// Each change checks that it found what it expected and stops with a message if it didn't, so a template change shows
// up here as a clear error and not as an app that looks wrong. Docs: docs/android.md
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ANDROID = "android";
const RES = path.join(ANDROID, "app", "src", "main", "res");
// Keep in step with --bg in src/styles/tokens.css (the same two colours as theme-color in layouts/Base.astro).
const DARK = "#121212";
const LIGHT = "#ededec";

const fail = (message) => {
  console.error(`\nandroid-project: ${message}\n`);
  process.exit(1);
};

const run = (args) => execFileSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });

async function files(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await files(full)));
    else found.push(full);
  }
  return found;
}

/**
 * Edge to edge: the page draws behind the status and navigation bars and keeps clear of them with its own padding.
 * EdgeToEdge.enable has to come AFTER super.onCreate. BridgeActivity swaps the launch theme (which has a title bar)
 * for AppTheme.NoActionBar inside it; enabling first builds the window under the launch theme, and the phone then
 * shows a title bar with the app name above the page.
 */
async function mainActivity() {
  const [file] = (await files(path.join(ANDROID, "app", "src", "main", "java"))).filter((f) =>
    f.endsWith("MainActivity.java"),
  );
  if (!file) fail("MainActivity.java not found. Did the Capacitor template change?");
  const pkg = /^package\s+([\w.]+);/m.exec(await readFile(file, "utf8"))?.[1];
  if (!pkg) fail(`No package line in ${file}.`);
  await writeFile(
    file,
    `package ${pkg};

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
    }
}
`,
  );
}

const colorFile = (name, hex) => `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="${name}">${hex}</color>
</resources>
`;

/** The window and the Android 12+ splash take the page's background, in light and in dark, so nothing flashes white. */
async function theme() {
  await writeFile(path.join(RES, "values", "eta_colors.xml"), colorFile("eta_background", LIGHT));
  const night = path.join(RES, "values-night");
  await mkdir(night, { recursive: true });
  await writeFile(path.join(night, "eta_colors.xml"), colorFile("eta_background", DARK));

  const file = path.join(RES, "values", "styles.xml");
  let styles = await readFile(file, "utf8");
  const addTo = (style, item) => {
    const open = new RegExp(`(<style\\s+name="${style.replace(".", "\\.")}"[^>]*>)`);
    if (!open.test(styles)) fail(`Style ${style} not found in styles.xml. Did the template change?`);
    if (!styles.includes(item)) styles = styles.replace(open, `$1\n        ${item}`);
  };
  addTo("AppTheme.NoActionBar", '<item name="android:windowBackground">@color/eta_background</item>');
  // Tells the phone the page may draw into the camera cutout. Without it some makers (Xiaomi's HyperOS, for one) keep
  // the app below the cutout and fill the gap with the window background.
  const cutout = '<item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>';
  addTo("AppTheme.NoActionBar", cutout);
  addTo("AppTheme.NoActionBarLaunch", cutout);
  addTo(
    "AppTheme.NoActionBarLaunch",
    '<item name="windowSplashScreenBackground">@color/eta_background</item>',
  );
  // Whatever the phone draws outside the page is a plain colour. The template's launch picture would be stretched into it.
  styles = styles.replace("@drawable/splash", "@color/eta_background");
  await writeFile(file, styles);
}

// The logo, from the same sources the site's icons are built from (scripts/build-brand-assets.mjs).
const svg = (name) => readFile(new URL(`../brand/${name}`, import.meta.url));
const raster = async (name, size, density = 384) =>
  sharp(await svg(name), { density }).resize(size, size).png().toBuffer();

async function sizeOf(file) {
  const { width, height } = await sharp(file).metadata();
  return { width, height };
}

/** The E on a transparent square, `share` of the square tall. */
async function mark(width, height, share) {
  const e = await sharp(await svg("mark.svg"), { density: 300 })
    .resize({ height: Math.round(Math.min(width, height) * share) })
    .png()
    .toBuffer();
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: e, gravity: "centre" }])
    .png()
    .toBuffer();
}

async function icons() {
  const launcher = (await files(RES)).filter((f) =>
    /[\\/]mipmap-[^\\/]+[\\/]ic_launcher(_round|_foreground)?\.png$/.test(f),
  );
  if (!launcher.length) fail("No launcher icons under res/mipmap-*. Did the Capacitor template change?");

  const adaptiveFile = path.join(RES, "mipmap-anydpi-v26", "ic_launcher.xml");
  const adaptive = await readFile(adaptiveFile, "utf8").catch(() => "");
  if (!adaptive.includes("ic_launcher_background") || !adaptive.includes("ic_launcher_foreground"))
    fail("The adaptive icon doesn't use ic_launcher_background and _foreground. Did the template change?");
  const background = path.join(RES, "values", "ic_launcher_background.xml");
  await writeFile(background, colorFile("ic_launcher_background", DARK));

  for (const file of launcher) {
    const { width } = await sizeOf(file);
    if (file.endsWith("_foreground.png")) {
      // Only the middle two thirds of an adaptive icon always shows, so the E stays well inside it.
      await writeFile(file, await mark(width, width, 0.4));
    } else if (file.endsWith("_round.png")) {
      const half = width / 2;
      const circle = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}">` +
          `<circle cx="${half}" cy="${half}" r="${half}"/></svg>`,
      );
      const round = await sharp(await raster("icon-flat.svg", width))
        .composite([{ input: circle, blend: "dest-in" }])
        .png()
        .toBuffer();
      await writeFile(file, round);
    } else await writeFile(file, await raster("icon.svg", width));
  }
}

/**
 * Android 11 and older show this picture while the app starts; 12 and newer show the icon on the colour set above.
 * It is a plain colour on purpose: a logo here gets stretched into any strip the web view leaves uncovered.
 */
async function splash() {
  const pictures = (await files(RES)).filter((f) => /[\\/]drawable[^\\/]*[\\/]splash\.png$/.test(f));
  if (!pictures.length) console.warn("android-project: no splash.png found, the template's splash stays.");
  for (const file of pictures) {
    const { width, height } = await sizeOf(file);
    const background = file.includes("night") ? DARK : LIGHT;
    const plain = sharp({ create: { width, height, channels: 3, background } });
    await writeFile(file, await plain.png().toBuffer());
  }
}

/** A newer build has to carry a higher versionCode to install over an older one. Minutes since 2026 never goes down. */
async function version() {
  const file = path.join(ANDROID, "app", "build.gradle");
  const gradle = await readFile(file, "utf8");
  const code = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 60_000);
  const name = JSON.parse(await readFile("package.json", "utf8")).version;
  const next = gradle
    .replace(/(versionCode\s*=?\s*)\d+/, `$1${code}`)
    .replace(/(versionName\s*=?\s*)"[^"]*"/, `$1"${name}"`);
  if (next === gradle) fail("versionCode and versionName not found in app/build.gradle. Template changed?");
  await writeFile(file, next);
}

if (!existsSync(path.join("dist", "index.html")))
  fail("dist/index.html is missing. Run `npm run android`, or `npm run build` first.");
if (!existsSync(ANDROID)) run(["cap", "add", "android"]);

await mainActivity();
await theme();
await icons();
await splash();
await version();
run(["cap", "sync", "android"]);
console.log("\nandroid/ is ready. Build it with: cd android && ./gradlew assembleDebug");
