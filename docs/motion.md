# Motion

Tokens live in `src/styles/tokens.css`. Use them instead of typing a new curve into a component.

| Token              | Value                            | Use                                           |
| ------------------ | -------------------------------- | --------------------------------------------- |
| `--ease`           | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Hover, color and small state changes          |
| `--ease-out-quart` | `cubic-bezier(0.25, 1, 0.5, 1)`  | Things arriving, progress fills, count nudges |
| `--ease-out-expo`  | `cubic-bezier(0.16, 1, 0.3, 1)`  | Menu and toast entrances                      |
| `--ease-sheet`     | `cubic-bezier(0.32, 0.72, 0, 1)` | Sheets, the result dock, sliding tab blocks   |
| `--ease-in-out`    | `cubic-bezier(0.65, 0, 0.35, 1)` | Something on screen moving to another spot    |
| `--dur-press`      | 120ms                            | Press scale                                   |
| `--dur-hover`      | 150ms                            | Hover background                              |
| `--dur-state`      | 200ms                            | Selected, checked, color changes              |

## Rules

- Entrances ease out. Exits ease in and take about 75% of the entrance time (sheets: 350ms in, 180ms out).
- Linear is for spinners and shimmers only. Time itself isn't animated: the countdown ticks, it doesn't count up.
- Press scale is 0.92 on small round buttons, 0.97 on tabs and tiles, 0.98 on wide cards. Never scale a whole list row.
- Nothing starts from `scale(0)`. Start at 0.9 or higher.
- Stagger under 50ms per item and stop after about 8.
- Animate `transform` and `opacity`. Progress fills slide a full-width bar with `translateX` instead of changing `width`.
- Every animation needs a `prefers-reduced-motion` version: none, or a plain fade.
- A sheet is a `<dialog>` that goes through `ui/useSheetDialog.ts`, which gives it an exit. Don't call `dialog.close()` directly.
- Springs are for dragging only (the result sheet). Everything else uses the curves above.

## Moments

- **An upgrade finishes while you watch** (`useJustFinished`): the row's tint fades over 1.6s and the mark pops once. Rows already done when the page opened stay still.
- **The last minute**: the countdown turns amber (`data-soon`).
- **Idle slots**: the worker's face dims and breathes, three Zs drift up (transform and opacity only), and each slot starts at a different point in the loop.
- **Rows ease in once** (`useIntro`): up to eight, 40ms apart, only the first time a lane shows. Switching tabs doesn't replay it.

## Haptics

Code is in `ui/haptics.ts`. It only works in Chrome on Android (iPhone has no web vibration), only on touch screens, and it turns off with the Settings switch. I followed Android's haptics guidance, Apple's HIG and the W3C Vibration spec.
- A buzz confirms a change the person just made, and nothing else. No buzz for scrolling, page loads, timers, toasts or anything the app did itself. Too much buzzing numbs the hands and people turn it all off.
- `tick` (10ms) is for picking among options or stepping a count. `confirm` (20ms) is for committing something, so it feels firmer.
- Only when something changed. Tapping the tab you're already on, or a stepper at its limit, stays silent. Call it from the one place that changes the state, so a tap and a swipe feel the same.
- The same action feels the same everywhere. Every tab or segmented control ticks, whether tapped or swiped.
- Buzzes closer than 70ms are dropped, so fast tapping doesn't turn into one long hum.
- A buzz never stands alone. There's always a visible change next to it, so the app works the same with haptics off.

Where each one is:
- `tick`: village tabs, Finish categories, About tabs, Settings pills (theme, clock, start on), the Lv / Now switch, boost and potion steppers, the Earlier use presets, the boost timeline pills and stretches, switching to another saved village.
- `confirm`: Settings switches, the helper preview, Plan it, Reset (plan changes), Clear time, Forget this village, Forget saved data.
- Silent on purpose: opening or closing sheets, menus and sections, Update, Import, Paste, Install, the lane tiles and About's jump links, rows that open a sheet, share. Each already shows a big visible change.

Don't add haptics to the finish moment, the last-minute warning, toasts or hover. They happen without a touch, and several can land at once.

## Toggles and layout

A toggle must never change the height of what's around it. When two versions of some text swap, stack them in one grid cell (the cell takes the taller height) and trade opacity. When a list changes length, reserve the larger height. `HelperPreview` and the turns box in `UpgradeSheet` do this.

## Offline

The app carries every page, script, font and picture inside the APK, so there is nothing to cache and nothing to wait for. Updating means installing a new APK (docs/android.md).

## What's tested

Unit tests cover idle time, next upgrade, tab title, swipe decisions, share text and settings.

In real Chromium against the real components I checked that a sheet exits and ends closed for the X, Escape and a parent closing it, that reopening during an exit keeps it open, that the helper toggle never changes any height, that drawers open to content height and are inert when shut, that a row finishing while watched celebrates once, and that a visited page opens offline while an unvisited one falls back to the app.

Not checked: real iPhone Safari, real Android vibration and touch swiping on a device. Try those by hand.
