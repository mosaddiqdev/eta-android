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

| File              | Job                                                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `app.ts`          | Back button: closes the open menu or sheet, then goes back a page, then leaves the app. Sets the status bar icons on start. |
| `launchSplash.ts` | Tells the phone the page is up, so the launch splash can end.                                                               |
| `clipboard.ts`    | Paste button and Copy through the Clipboard plugin.                                                                         |
| `share.ts`        | The Android share sheet for "Share upgrades".                                                                               |
| `systemBars.ts`   | Status and navigation bar icon colour, following the theme (including a forced Light or Dark).                              |

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
- draws the launcher icons (adaptive foreground, round and legacy) from `brand/`,
- writes the launch splash (animated and still, light and dark) from `brand/mark.svg` (`scripts/android-splash.mjs`),
- sets the window and splash background to the page colours (light and dark),
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

The splash is Android's own, not part of the page. The page used to draw it, which made it start late and stutter: it only began once the web view had loaded and ran at the same moment the page was starting up.
- **What it is.** The E from `brand/mark.svg` on the page colour. `scripts/android-splash.mjs` generates the drawables from the logo file, so the splash can't drift from the logo. Light and dark have their own, in that theme's lane colours (the test checks them against `tokens.css`).
- **Android 12 and newer** play it as an animated vector in the system's splash window, from the moment of the tap and off the app's threads. About 580 ms: the three lanes slide in 80 ms apart (top and bottom from the left, the middle from the right) while the mark settles in from 94%. Android advises under a second.
- **Android 11 and older** show the finished mark, standing still, on the same colour.
- **It is held until the page is ready.** `MainActivity` installs the splash before `super.onCreate` and keeps it up. `src/native/launchSplash.ts` calls the small `EtaSplash` plugin once the page has loaded and gone idle (timers and idle callbacks, never animation frames, because the page isn't drawn while the splash holds it). If that never happens, the splash ends by itself after 3 seconds.
- **The exit** is a 260 ms fade with a 5% grow over the page, which is already drawn. It runs on the render thread. If the page was ready before the mark finished moving, the fade waits for it, but never more than 400 ms.
- **Once per start.** The page sets a session flag so moving between pages doesn't ask again. The home page, which only redirects, leaves it to the page it sends you to (`data-leaving`).
- **The web view** is given the page colour as its background, so the moment before the first paint isn't white in the dark.
- With "Remove animations" on, Android skips the slide and the mark simply appears.

One limit: the system draws the splash before the app runs, so it follows the phone's light or dark setting, not a Light or Dark forced in the app's settings. With "Auto", which is the default, they agree.

To change it: motion, distances and colours are in `scripts/android-splash.mjs`; the hold, the fade and the 3 second limit are at the top of `MainActivity` in `scripts/android-project.mjs`.

## The splash follows the theme

The launch splash is drawn by Android before any page runs, so it can't read the app's setting from the page. The page
tells Android instead (`src/native/nativeTheme.ts`, `EtaThemePlugin.java`): the choice is kept in the app's own
preferences and `MainActivity` applies it before the splash is built. On Android 12 and newer that is
`UiModeManager.setApplicationNightMode`, which Android remembers for the app; before that it is
`AppCompatDelegate.setDefaultNightMode`, and the splash there is the system's own window background, which a forced
theme can't change. Unchecked on a device: that the 12+ splash is in the forced theme on the very next cold start.

## Notifications

The page works out what to say, the phone shows it. `src/notifications/compose.ts` turns the plan's events into
notifications: an upgrade finished (the building at its new level, or the hero or pet), a helper is free (the helper's
portrait, and the upgrade it would save the most time on), and the Clock Tower is ready. Each has a picture from
`public/game` in the app's assets, which `EtaNotifier.java` decodes and centres on a square for the large icon.
- `src/native/notificationSync.ts` sends the whole list to Android at app start, when the saved villages change and when
  a notification setting changes. Each time it replaces the list, so there are never two alarms for one thing.
- `EtaNotifier.java` keeps the list and sets one `AlarmManager` alarm for each (`setExactAndAllowWhileIdle` when
  exact alarms are allowed, `setAndAllowWhileIdle` otherwise). Restarting the phone or updating the app clears alarms, so
  `EtaBootReceiver` sets them again from the saved list and still shows anything that came due in the last two hours.
- Three channels, one per sound: the phone's own, the game's upgrade sound, and none (also used for quiet hours).
  Android fixes a channel's sound when it is created and recreating one wipes what the person changed, so channels are
  per sound and made once, and which kinds are on and the one sound for all of them are the app's own settings
  (`src/notifications/kinds.ts`, the Notifications sheet in Settings). The first build's per-kind channels are deleted.
- The game's sounds: `scripts/android/sounds/` holds `clash_building`, `clash_hero` and `clash_lab` (.ogg, trimmed of dead air, with a
  fade-out, and all at -15 LUFS with peaks under -3 dB). They become `res/raw/`, and "Clash" in Settings plays the one that fits: a hero
  finishing, research or a pet (lab), or a building. The Helper and Clock Tower alerts use the building sound until
  they have one of their own. Each has its own channel, made once. A sound that is missing falls back to the phone's.
- Permissions: `POST_NOTIFICATIONS` is asked at run time on Android 13 and up. Exact alarms use `USE_EXACT_ALARM` on
  Android 13 and newer (granted with the install) and `SCHEDULE_EXACT_ALARM` before that (the person allows it in
  the phone's settings, which Settings links to). Without exact alarms the notifications can come a few minutes late.
  Google Play only lets alarm and calendar apps declare `USE_EXACT_ALARM`, so a Play release should rethink it.
  `EtaBootReceiver` also sets the alarms again when the exact alarm permission changes.
- Times come from the last import. A potion used after it isn't known, so paste again to bring them back in line.
- Not checked on a device: Doze timing, the boot receiver, and how the large icon looks on each maker's skin.

## Importing without the copy, open, paste dance

Android 10 and newer let only the app in front, or the keyboard, read the clipboard, so nothing can watch for a copy in the background. Two things shorten the trip instead.
- **Import when opened** (Settings, on by default). When the app comes to the front, `useClipboardImport` reads the clipboard. A new village export is imported and a "Updated #TAG" toast says so. Text that isn't a JSON object, text already saved, and text already looked at (a short fingerprint in `clasheta.lastClip`, so a village you forgot doesn't return) are skipped silently. Android 12 and newer show their own "pasted from clipboard" note when an app reads it.
- **The "Import village" tile.** The player adds it once to the Quick Settings panel. A tap opens `EtaImportActivity`, a see-through screen over the game (its own task, out of the recent apps, no animation, transparent window and web view). It loads `quick-import.html`, whose script (`src/native/quickImport.ts`) reads the clipboard, saves the village with the same `withVillage` the village page uses, sets the alarms (`syncNotificationsNow`), shows a system toast ("#TAG imported", "already up to date", or why not) and closes the screen with `EtaImport.finish`. The game never leaves the front. The tile always imports and ignores the "Import when opened" switch. Android 14 needs a `PendingIntent` to start it. If ClashETA was open in the background, `reloadWhenVillagesChanged` (`src/native/app.ts`) reloads its page on return, because it did not see the new village. The clipboard is read natively in `onWindowFocusChanged` (the first moment the screen has focus) and handed to the page through `EtaImport.clipboard`; the web read with retries is only a fallback. `EtaImportActivity` overrides `setTheme`, because `BridgeActivity` would otherwise replace the see-through theme with its opaque one, and sets the window format to translucent. While the screen is up the game is paused by Android, like under any screen, so the import is kept short: the page is bare, and the game data loads while the clipboard is read.

Cost: the tile is a service Android starts only while the panel is showing it (`ACTIVE_TILE`), and the import is a page loading once for about a second. Nothing runs in the background and nothing watches the clipboard. The notification alarms are one-shot `AlarmManager` entries with no service or wake lock. Setting battery use to Unrestricted doesn't make the app do more; it only stops phone makers' power managers from delaying or dropping the alarms. Settings tells players this.

Not checked on a device: that the screen really is see-through (BridgeActivity sets its own opaque theme, which `EtaImportActivity` undoes in code), that Android draws no launch splash for it, and the clipboard read right after it opens on each maker's skin.

## Home-screen widgets

Each widget is a folder, so none grows into one big file. The native side is `scripts/android/widgets/<widget>/` (`java/` with one file per concern, `res/`, `manifest.xml`) and the page side is `src/widgets/<widget>/`. `scripts/android-widgets.mjs` copies every folder into the generated project and registers the plugins, so adding a widget touches nothing else. `common/` holds what they share: `EtaWidgetsPlugin` (the page sends `{widget, data}`; the plugin keeps it and calls `<Widget>Provider.refresh`) and `EtaWidgetTheme` (the app's colours, following the app's Auto / Dark / Light). The README in `widgets/` has the rules.

**Next finish** (`nextfinish/`, `src/widgets/nextFinish/`). The upgrade that finishes next, across all saved villages, in the village page's look (the same tokens, lane colours and game pictures, the system corner radius on Android 12+). Three layouts by the size the home screen gives it: 4×2 (picture, name, level, day and time, and Builders / Lab / Pets as busy of how many), 2×2 and 4×1. Tapping it opens the app.
- **No ticking.** It shows a day and a clock time ("Tomorrow, 10:05 PM"), worded as on the village page, with the clock following the app's setting. Nothing counts down, so nothing wakes up every second or minute and `updatePeriodMillis` is 0.
- **When it redraws:** when the page sends new data (a paste, the tile, a settings change of clock or theme, app start), when the next upgrade finishes (`NextFinishSchedule`, one alarm, replaced on every draw, so it moves on to the one after), at local midnight (so "Tomorrow" becomes "Today"), and when the time zone, clock or language changes.
- **Data.** The page sends every running upgrade for every village with the words already made (`data.ts`). The phone chooses the next one and drops what has finished each time it draws (`NextFinishData`), and counts busy workers per lane the way the village page does, a Goblin as an extra worker while he works. So it stays right between imports with the app closed.
- **Pictures** come from the app's own assets, shrunk to what a tile shows (widgets have a memory limit on the home screen).
- **Theme.** Auto follows the phone and flips with it (Android 12+ `setColorInt` with a light and a dark colour, and night-aware drawables); a forced Dark or Light uses fixed ones. The picker preview is the real 4×2 layout with sample words.
- **Sizes** are chosen from the size options on every Android version, not the Android 12 size map, which keeps one code path.

Not checked on a device: how each launcher's cells map to the three sizes, the picker preview, and the pictures' memory use on low-end phones.

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
