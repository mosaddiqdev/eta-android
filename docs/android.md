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

## A gap above the page

If a bar with the app name shows above the page, it is Android's title bar. It appears when `EdgeToEdge.enable(this)` runs before `super.onCreate(...)` in `MainActivity`: the window is then built under the launch theme, which has a title bar, before `BridgeActivity` switches to `AppTheme.NoActionBar`. The generated `MainActivity` calls it after `super.onCreate`, and `scripts/android-project.mjs` also makes the window background a plain colour and declares `windowLayoutInDisplayCutoutMode: shortEdges`. For any other layout problem, to see exactly where the page starts, run the workflow with the debug box ticked (`gh workflow run android.yml -f debug=true`): the build draws a red line at the page's top edge and prints the safe-area numbers, WebView version and header position at the bottom. Normal builds never include it.

## Data and updates

Saved villages and settings live in the WebView's localStorage for the app. Installing a newer APK over the old one keeps them. Game data and pictures are inside the APK, so a game-data update (the daily pull request) reaches phones with the next build.

## Checked by hand

Not tried on a device yet: Back from each sheet, the paste button's behaviour on different Android versions, the share sheet, and the status bar icons with a forced theme. See `TASKS.md`.
