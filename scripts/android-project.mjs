// Builds the Android project in android/ from the built site in dist/. `npm run android` runs it after `npm run build`.
//
// android/ is generated and not committed. `cap add android` writes the template that belongs to the installed
// Capacitor version, so it can't fall behind the plugins, and this script puts the few app-specific changes on top.
// Each change checks that it found what it expected and stops with a message if it didn't, so a template change shows
// up here as a clear error and not as an app that looks wrong. Docs: docs/android.md
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { splashDrawables, statusIcon } from "./android-splash.mjs";

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
 *
 * The launch splash (see theme() for the picture) is installed BEFORE super.onCreate, as Android's guide asks. While
 * the page loads, Android holds the app's first frame back and keeps the splash up; the page says it is ready through
 * EtaSplashPlugin, and the splash fades out over a page that is already drawn. src/native/launchSplash.ts is the other half.
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

import android.content.Intent;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.view.animation.PathInterpolator;
import android.webkit.WebView;
import androidx.activity.EdgeToEdge;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.splashscreen.SplashScreenViewProvider;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    // If the page never says it is ready (a script error, say), the splash still ends.
    private static final long SPLASH_LIMIT_MS = 3000;
    // A page that is ready early still lets the mark finish moving, but waits no more than this for it.
    private static final long MARK_WAIT_MS = 400;
    private static final long FADE_MS = 260;

    // Set by EtaSplashPlugin once the page has loaded and gone idle.
    volatile boolean pageReady = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The app's own Auto / Dark / Light, before the splash is built, so the splash is in that theme.
        EtaThemePlugin.applySaved(this);
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        long started = SystemClock.uptimeMillis();
        splash.setKeepOnScreenCondition(
            () -> !pageReady && SystemClock.uptimeMillis() - started < SPLASH_LIMIT_MS);
        splash.setOnExitAnimationListener(this::leaveSplash);
        registerPlugin(EtaSplashPlugin.class);
        registerPlugin(EtaThemePlugin.class);
        registerPlugin(EtaNotificationsPlugin.class);
        registerPlugin(EtaImportPlugin.class);
        // Opened from the "Import village" tile? The page asks for this once it is up.
        EtaImportPlugin.note(getIntent());

        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        // The page has fixed bars (header, result dock) that Android's stretch effect would warp along with the content,
        // and the web view's own scrollbar is drawn by Android, out of reach of CSS.
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            // A web view with nothing drawn yet is white, which would flash in the dark between the splash and the page.
            webView.setBackgroundColor(getColor(R.color.eta_background));
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        // The app was already running when the tile was tapped.
        EtaImportPlugin.note(intent);
        super.onNewIntent(intent);
    }

    // Fades the splash out and lets it grow a little, over the page underneath. Both run on the render thread, so the
    // page's first moments can't make the exit stutter. The curve is Material 3's emphasized accelerate: it leaves the
    // splash almost untouched for the first frames, while the page paints under it.
    private void leaveSplash(SplashScreenViewProvider splash) {
        // Cutting the mark off halfway through its slide would read as a stutter, so it is let finish first.
        long markLeft = splash.getIconAnimationDurationMillis()
            - (System.currentTimeMillis() - splash.getIconAnimationStartMillis());
        long wait = Math.max(0, Math.min(markLeft, MARK_WAIT_MS));
        splash.getView().animate()
            .alpha(0f)
            .scaleX(1.05f)
            .scaleY(1.05f)
            .setStartDelay(wait)
            .setDuration(FADE_MS)
            .setInterpolator(new PathInterpolator(0.3f, 0f, 0.8f, 0.15f))
            .withEndAction(splash::remove)
            .start();
    }
}
`,
  );
  const dir = path.dirname(file);
  await writeFile(
    path.join(dir, "EtaSplashPlugin.java"),
    `package ${pkg};

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// The page's way of telling MainActivity it is up, so the launch splash can end (src/native/launchSplash.ts).
@CapacitorPlugin(name = "EtaSplash")
public class EtaSplashPlugin extends Plugin {
    @PluginMethod
    public void ready(PluginCall call) {
        if (getActivity() instanceof MainActivity) ((MainActivity) getActivity()).pageReady = true;
        call.resolve();
    }
}
`,
  );
  return { dir, pkg };
}

/**
 * Notifications and the theme bridge. The Java files are in scripts/android/ with the package name left for this to fill
 * in, and the manifest gets the permissions and the two receivers. Docs: docs/android.md
 */
async function notifications({ dir, pkg }) {
  const source = new URL("./android/", import.meta.url);
  for (const name of (await readdir(source)).filter((f) => f.endsWith(".java"))) {
    const java = await readFile(new URL(name, source), "utf8");
    await writeFile(path.join(dir, name), java.replaceAll("__PACKAGE__", pkg));
  }
  // The game's upgrade sounds, whichever have been added to scripts/android/sounds/: clash_building, clash_hero and
  // clash_lab (.ogg, .mp3, .wav or .m4a). Without any the app still builds and Settings offers only the phone's sound.
  const sounds = await readdir(new URL("sounds/", source)).catch(() => []);
  const raw = path.join(RES, "raw");
  await rm(raw, { recursive: true, force: true });
  for (const name of sounds.filter((f) => /^clash_(building|hero|lab)\.(ogg|mp3|wav|m4a)$/.test(f))) {
    await mkdir(raw, { recursive: true });
    await writeFile(path.join(raw, name), await readFile(new URL(`sounds/${name}`, source)));
  }
  const small = path.join(RES, "drawable", "ic_stat_eta.xml");
  await writeFile(small, statusIcon((await svg("mark.svg")).toString()));
  // The tile's icon: a clipboard with an arrow into it. White on clear, 24dp, as Android asks of tile icons.
  await writeFile(
    path.join(RES, "drawable", "ic_tile_import.xml"),
    `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:strokeColor="#FFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:strokeLineJoin="round"
        android:pathData="M16,4h2a2,2 0 0 1 2,2v14a2,2 0 0 1 -2,2H6a2,2 0 0 1 -2,-2V6a2,2 0 0 1 2,-2h2" />
    <path android:strokeColor="#FFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:strokeLineJoin="round"
        android:pathData="M10,2h4a1,1 0 0 1 1,1v2a1,1 0 0 1 -1,1h-4a1,1 0 0 1 -1,-1V3a1,1 0 0 1 1,-1z" />
    <path android:strokeColor="#FFFFFF" android:strokeWidth="2" android:strokeLineCap="round" android:strokeLineJoin="round"
        android:pathData="M12,10v7M9,14l3,3 3,-3" />
</vector>
`,
  );

  const file = path.join(ANDROID, "app", "src", "main", "AndroidManifest.xml");
  let manifest = await readFile(file, "utf8");
  if (!manifest.includes("</application>") || !manifest.includes("</manifest>"))
    fail("AndroidManifest.xml has no application or manifest end tag. Did the template change?");
  const add = (marker, tag, before) => {
    if (!manifest.includes(marker)) manifest = manifest.replace(before, `${tag}\n    ${before}`);
  };
  // Permission to show notifications is asked at run time on Android 13 and up. Exact alarms are granted by the person in
  // the phone's settings; without them the alarms still go off, up to a few minutes late.
  for (const name of ["POST_NOTIFICATIONS", "RECEIVE_BOOT_COMPLETED"])
    add(
      `android.permission.${name}"`,
      `<uses-permission android:name="android.permission.${name}" />`,
      "</manifest>",
    );
  // Exact alarms: Android 13 and newer grant USE_EXACT_ALARM with the install, older ones need the person to allow
  // SCHEDULE_EXACT_ALARM. Google Play only lets alarm and calendar apps declare the first (docs/android.md).
  add(
    'android.permission.SCHEDULE_EXACT_ALARM"',
    '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />',
    "</manifest>",
  );
  add(
    'android.permission.USE_EXACT_ALARM"',
    '<uses-permission android:name="android.permission.USE_EXACT_ALARM" />',
    "</manifest>",
  );
  add(
    ".EtaAlarmReceiver",
    '<receiver android:name=".EtaAlarmReceiver" android:exported="false" />',
    "</application>",
  );
  add(
    ".EtaBootReceiver",
    `<receiver android:name=".EtaBootReceiver" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.QUICKBOOT_POWERON" />
                <action android:name="android.app.action.SCHEDULE_EXACT_ALARM_PERMISSION_STATE_CHANGED" />
            </intent-filter>
        </receiver>`,
    "</application>",
  );
  // The Quick Settings tile. Active mode: the phone doesn't keep the service bound while the panel is closed.
  add(
    ".EtaImportTile",
    `<service android:name=".EtaImportTile" android:exported="true" android:label="Import village"
            android:icon="@drawable/ic_tile_import" android:permission="android.permission.BIND_QUICK_SETTINGS_TILE">
            <intent-filter>
                <action android:name="android.service.quicksettings.action.QS_TILE" />
            </intent-filter>
            <meta-data android:name="android.service.quicksettings.ACTIVE_TILE" android:value="true" />
        </service>`,
    "</application>",
  );
  await writeFile(file, manifest);
}

const colorFile = (name, hex) => `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="${name}">${hex}</color>
</resources>
`;

/**
 * The window and the launch splash take the page's background, in light and in dark, so nothing flashes white. The
 * splash is the E from brand/mark.svg on that colour (scripts/android-splash.mjs): animated on Android 12 and newer,
 * standing still before that. MainActivity keeps it up until the page is ready.
 */
async function theme() {
  await writeFile(path.join(RES, "values", "eta_colors.xml"), colorFile("eta_background", LIGHT));
  const night = path.join(RES, "values-night");
  await mkdir(night, { recursive: true });
  await writeFile(path.join(night, "eta_colors.xml"), colorFile("eta_background", DARK));

  for (const { file, xml } of splashDrawables((await svg("mark.svg")).toString())) {
    await mkdir(path.join(RES, path.dirname(file)), { recursive: true });
    await writeFile(path.join(RES, file), xml);
  }
  // The template's own launch picture, in every size. Nothing points at it any more.
  for (const file of (await files(RES)).filter((f) => /[\\/]drawable[^\\/]*[\\/]splash\.png$/.test(f)))
    await rm(file, { force: true });

  const file = path.join(RES, "values", "styles.xml");
  let styles = await readFile(file, "utf8");
  // Puts the item first in the style, replacing one of the same name, so running this again on an android/ that
  // already has it can't leave two.
  const addTo = (style, item) => {
    const name = /name="([^"]+)"/.exec(item)[1];
    const block = new RegExp(`(<style\\s+name="${style.replace(".", "\\.")}"[^>]*>)([\\s\\S]*?)(</style>)`);
    const found = block.exec(styles);
    if (!found) fail(`Style ${style} not found in styles.xml. Did the template change?`);
    const rest = found[2].replace(new RegExp(`\\s*<item name="${name}">[^<]*</item>`), "");
    styles = styles.replace(block, () => `${found[1]}\n        ${item}${rest}${found[3]}`);
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
  addTo(
    "AppTheme.NoActionBarLaunch",
    '<item name="windowSplashScreenAnimatedIcon">@drawable/eta_splash_icon</item>',
  );
  // The theme the app wears once the splash is gone. installSplashScreen in MainActivity switches to it.
  addTo(
    "AppTheme.NoActionBarLaunch",
    '<item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>',
  );
  // Whatever the phone draws outside the page is a plain colour. The template's launch picture would be stretched into it.
  styles = styles.replace("@drawable/splash", "@color/eta_background");
  await writeFile(file, styles);
}

// The logo, from the same sources the site's icons are built from (scripts/build-brand-assets.mjs).
const svg = (name) => readFile(new URL(`../brand/${name}`, import.meta.url));
const raster = async (name, size, density = 384) =>
  sharp(await svg(name), { density })
    .resize(size, size)
    .png()
    .toBuffer();

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

  // Android 13+ tints the icon to the wallpaper when the person turns on themed icons. It uses the shape of the
  // foreground (the E with its slits) and ignores its colours, so the same picture does for both.
  for (const name of ["ic_launcher.xml", "ic_launcher_round.xml"]) {
    const file = path.join(RES, "mipmap-anydpi-v26", name);
    const xml = await readFile(file, "utf8").catch(() => "");
    if (xml.includes("</adaptive-icon>") && !xml.includes("<monochrome")) {
      const layer = '    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>';
      await writeFile(file, xml.replace("</adaptive-icon>", layer));
    }
  }

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

const activity = await mainActivity();
await theme();
await notifications(activity);
await icons();
await version();
run(["cap", "sync", "android"]);
console.log("\nandroid/ is ready. Build it with: cd android && ./gradlew assembleDebug");
