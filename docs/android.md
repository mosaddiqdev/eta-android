# The Android app

ClashETA ships as an Android app made with [Capacitor](https://capacitorjs.com): the same Astro site, shown in the phone's own WebView, with a thin native shell around it. Nothing about the screens is redrawn, so the app looks like the site did. The APK is built by GitHub Actions (`.github/workflows/android.yml`); nothing needs Android Studio or an SDK on your own machine.

## Why Capacitor

- The site stays the single source of truth. Tauri's mobile support and React Native would both mean rebuilding every screen or accepting a different rendering engine; Capacitor reuses the build as it is.
- It is current: Capacitor 8 is the stable line (9 is still in beta, so `@capacitor/*` is held on `^8` and Dependabot skips majors).
- The Android project is generated from the template of the installed version on every build, so it can't fall behind the plugins.

## Toolchain (Capacitor 8)

| Piece                           | Version                  | Where it is set                      |
| ------------------------------- | ------------------------ | ------------------------------------ |
| Node                            | 24 (Capacitor needs 22+) | `.nvmrc`                             |
| Java                            | 21                       | `actions/setup-java` in the workflow |
| Android Gradle Plugin / Gradle  | 8.13.0 / 8.14.3          | the generated template               |
| compileSdk / targetSdk / minSdk | 36 / 36 / 24             | the generated template               |

When Capacitor 9 is released it needs Node 24, Java and Gradle bumps and Android Studio 2026.1.1; read its upgrade guide before raising `@capacitor/*` to `^9`.

## What runs on top of the site

`src/native/` is the only code that knows about the app. In a desktop browser every function falls back to the web feature, so `npm run dev` still works.

| File            | Job                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `app.ts`        | Back button: closes the open menu or sheet, then goes back a page, then leaves the app. Sets the status bar icons on start. |
| `clipboard.ts`  | Paste button and Copy through the Clipboard plugin.                                                                         |
| `share.ts`      | The Android share sheet for "Share upgrades".                                                                               |
| `systemBars.ts` | Status and navigation bar icon colour, following the theme (including a forced Light or Dark).                              |

Haptics (`src/ui/haptics.ts`) use the Haptics plugin inside the app. The page draws edge to edge (`EdgeToEdge.enable` in the generated `MainActivity`), and the page's own `env(safe-area-inset-*)` padding keeps content clear of the bars. `SystemBars.insetsHandling` is `native` in `capacitor.config.json`, Capacitor's recommended setting: on Android System WebView 140 or newer the page reports the real insets itself, and on older ones Capacitor pads the web view and the page sees 0, so nothing is padded twice.

## Pages are `.html` files

Capacitor's local server answers any address without a file extension with the home page. `/village` would open Finish time. So the site is built with `build.format: "file"` (`finish.html`, `village.html`) and every link, and the redirect in `src/pages/index.astro`, names the file. `isCurrent` in `src/layouts/menu.ts` treats `/village`, `/village/` and `/village.html` as the same page.

## Building

```
npm install
npm run android          # builds the site, then creates or updates android/
cd android && ./gradlew assembleDebug
```

`npm run android` runs `scripts/android-project.mjs`, which runs `cap add android` the first time, then:
- writes `MainActivity` with edge-to-edge on,
- draws the launcher icons (adaptive foreground, round and legacy) and the splash pictures from `brand/`,
- sets the window and Android 12+ splash background to the page colours (light and dark),
- sets `versionCode` from the clock, so a newer build always installs over an older one,
- runs `cap sync android`.

Every step checks it found what it expected and stops with a message if the template changed. `android/` is in `.gitignore`.

In CI the same thing happens in one job. The APK is an artifact of the run (`eta-apk`). Pushing a tag such as `v0.1.0` also attaches it to a GitHub release.

## Signing

Without secrets the workflow builds `eta-debug.apk`, which installs fine for personal use. For a release APK that always updates in place, create a keystore once:

```
keytool -genkeypair -v -keystore release.jks -alias eta -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 release.jks     # paste the output into ANDROID_KEYSTORE_BASE64
```

Then add four repository secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`. The workflow then also builds, zip-aligns and signs `eta-release.apk`. Keep the keystore somewhere safe: an app signed with a different key can't be installed over this one.

## The app id

`appId` in `capacitor.config.json` is `app.foreman`. It is how Android tells apps apart, so change it before you share the first APK, not after: a different id installs as a second app, and saved villages (kept in the WebView's storage) don't move between them.

## Scrolling feel

The generated `MainActivity` turns off the web view's scrollbars (Android draws its own, which CSS can't hide) and its overscroll stretch. The header and the result dock are fixed, and the stretch moves the whole web view, so they would warp with the content. Scrolling inside sheets and the side menu still stops cleanly at the ends. To get the stretch back, delete the `setOverScrollMode` line in `scripts/android-project.mjs`.

## The splash screen

Two layers on one colour, with nothing to hand off between them.
1. **The phone's splash** is only a screen of the page's colour (dark or light), with an empty icon on it. `scripts/android-project.mjs` sets that up (`windowSplashScreenBackground`, a transparent `eta_splash_blank` icon, the window background). It is on screen for the instant before the page exists.
2. **The ClashETA splash is part of the page.** `src/ui/Splash.astro` draws the E from `brand/mark.svg` as three bar layers, `src/styles/splash.css` animates them, and `src/native/splash.ts` decides when it ends. Because it lives in the same document as the app, the end is a plain fade over a page that is already drawn, not a switch between a native picture and the web view.

Why not Android's own animated splash icon: it can only show one icon on one colour, it isn't shown at all when the app is launched some ways (a third-party launcher, the app info screen), and the switch from it to the web view was the stutter. Android's own guidance for apps that need more is the same pattern used here: a transparent icon on the window colour, then the app's own content.

The sequence, from the tap on the icon:

| Beat          | What happens                                                                                                                                                       | Where it is set           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| 0             | The phone's launch animation opens the window, on the page colour.                                                                                                 | The launcher              |
| 0 to 520 ms   | The whole mark settles in from 94% while the bars arrive one after another, 70 ms apart (top and bottom from the left, the middle from the right), each fading in. | `splash.css`              |
| 520 to 750 ms | The finished mark rests for a beat.                                                                                                                                | `MIN_MS` in `splash.ts`   |
| after that    | Once the page has loaded and gone idle, a 220 ms fade reveals it.                                                                                                  | `splash.ts`, `splash.css` |

It runs on transform and opacity only, which the compositor handles without the main thread, so the page starting up underneath cannot make it stutter. It uses the page's own theme colour, so a forced Light or Dark theme is honoured from the first frame of the page. With "Remove animations" on, the finished mark simply appears and fades. It shows once per app start (a session flag), never in a browser, and a CSS timer ends it after 2.4 seconds even if the script never does. The home page marks itself "leaving" when it redirects to My village, so the page it lands on shows the splash instead.

To change it: bar delays and slide distances are in `Splash.astro`, curves and durations in `splash.css`, the hold and fade in `splash.ts`.

## The status bar

A fade in the page colour sits under the status bar (`body::before` in `src/styles/base.css`); it is not black, because black on a dark page shows as a darker band.

## The result sheet and the keyboard

While a text field has focus (`useTyping` in `src/features/finish/result/`), the verdict chip and suggestions leave the result sheet and it glides down to its summary line, so it doesn't sit over the boxes being typed in. It comes back a moment after the field loses focus.

## The page never pans sideways

`html` in `src/styles/base.css` is `overflow-x: clip` and `touch-action: pan-y`. Anything a few pixels wider than the screen (the panel slide-in moves a whole tab 1rem sideways, and the idle badges stick out of their cards) would otherwise let a diagonal drag shift the whole layout. Rows that scroll sideways on purpose are scrollers of their own and keep working. If a layout ever seems clipped on the right, run the debug build: its last line names the rightmost element.

## A gap above the page

If a bar with the app name shows above the page, it is Android's title bar. It appears when `EdgeToEdge.enable(this)` runs before `super.onCreate(...)` in `MainActivity`: the window is then built under the launch theme, which has a title bar, before `BridgeActivity` switches to `AppTheme.NoActionBar`. The generated `MainActivity` calls it after `super.onCreate`, and `scripts/android-project.mjs` also makes the window background a plain colour and declares `windowLayoutInDisplayCutoutMode: shortEdges`. For any other layout problem, to see exactly where the page starts, run the workflow with the debug box ticked (`gh workflow run android.yml -f debug=true`): the build draws a red line at the page's top edge and prints the safe-area numbers, WebView version and header position at the bottom. Normal builds never include it.

## The lockfile and formatting

The workflows install with `npm ci` and fall back to `npm install` when `package-lock.json` doesn't match `package.json`, so a stale lockfile never stops an APK build. The **Tidy** workflow (`.github/workflows/tidy.yml`) repairs the lockfile and applies Biome's formatting on its own whenever `package.json` changes, and commits the result. Run `git pull` afterwards to get it. It can also be started by hand from the Actions tab, or with `gh workflow run tidy.yml`.

## Data and updates

Saved villages and settings live in the WebView's localStorage for the app. Installing a newer APK over the old one keeps them. Game data and pictures are inside the APK, so a game-data update (the daily pull request) reaches phones with the next build.

## Checked by hand

Not tried on a device yet: Back from each sheet, the paste button's behaviour on different Android versions, the share sheet, and the status bar icons with a forced theme. See `TASKS.md`.
