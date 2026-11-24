# Home-screen widgets

One folder per widget. `scripts/android-widgets.mjs` copies them into the generated Android project.

```
widgets/
  common/            Shared by every widget: the plugin the page talks to, and the app's colours.
    java/
  <widget>/          One widget, for example nextfinish
    java/            The provider and everything it needs, one concern per file
    res/             layout/, drawable/, xml/ (the provider info), values/ ... files named eta_<short>_*
    manifest.xml     What goes inside <application> (the receiver)
```

Rules that keep a widget independent:
- Its files start with its own prefix (`NextFinish*.java`, `eta_nf_*` resources), so two widgets never collide.
- The page sends it data with `EtaWidgets.update({ widget: "nextFinish", data })` (src/widgets/plugin.ts). The plugin keeps
  the data and calls `<Widget>Provider.refresh(Context)`, found by that name, so the plugin never lists widgets.
- Its page side lives in `src/widgets/<widget>/`.
- Widgets show times as a day and a clock time, never a counting timer: nothing needs to wake up every second or minute.
  A widget refreshes when its data changes, when something it shows ends, and at midnight.

Docs: docs/android.md

## Font

Widget text can't rely on a font set in the layout: it shows in the phone's own font on launchers that ignore it (seen on a Pixel launcher with `android:fontFamily="@font/..."`). So a widget that wants the app's typeface draws its words as pictures: `common/java/EtaWidgetText` draws a line with Plus Jakarta Sans (Medium, Bold) or JetBrains Mono (SemiBold) from `common/res/font/`, in white, and an ImageView in the layout shows it with a colour filter (`setColorInt` on Android 12+, so it flips with the phone's theme; a fixed colour before that). The line is cut with an ellipsis to the room the layout leaves it, so it never needs more. Each text ImageView has no description; the row has one for screen readers. The weights are static cuts of the variable fonts the page uses. Another weight is one more `.ttf` and a `Face` entry.

Both widgets do this. `EtaWidgetInk` is the base of a widget's renderer (the views, the theme, `text(...)`), and `EtaWidgetPreview` gives the picker a real drawing of the widget on Android 15 and newer, because the layout alone has no words. A `TextView` is not used for anything that should look like the app.

## Shared helpers (`common/java`)

`EtaWidgetVillages` (what the page sent for a widget that shows a village's workers, and the arithmetic on it: next to finish, busy of how many).

`EtaWidgetWhen` (the day and clock words), `EtaWidgetText` (the words as pictures, in the app's fonts), `EtaWidgetArt` (pictures from the app's assets, shrunk for the home screen), `EtaWidgetSchedule` (the one alarm a widget needs), `EtaWidgetViews` (theme-aware colours) and `EtaWidgetTheme` (the app's colours). A widget keeps only what is its own: its data, its drawing and its layouts.
