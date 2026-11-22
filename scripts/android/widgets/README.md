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

Widgets use the app's own typeface, Plus Jakarta Sans (OFL): static Medium and Bold cut from the variable font the page uses, in `common/res/font/`. Each TextView names its weight file directly, `@font/eta_sans_500` or `@font/eta_sans_700`, and has no `textStyle="bold"` (that would ask Android to thicken a Bold that is already Bold). This is how other widget apps ship a font too. `eta_sans.xml` is the same two weights as a family, for anything that wants to ask by weight. Another weight is one more `.ttf`.

## Shared helpers (`common/java`)

`EtaWidgetWhen` (the day and clock words), `EtaWidgetArt` (pictures from the app's assets, shrunk for the home screen), `EtaWidgetSchedule` (the one alarm a widget needs), `EtaWidgetViews` (theme-aware colours) and `EtaWidgetTheme` (the app's colours). A widget keeps only what is its own: its data, its drawing and its layouts.
