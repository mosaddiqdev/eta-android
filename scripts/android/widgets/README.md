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
