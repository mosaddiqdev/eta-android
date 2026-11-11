# Brand and social preview

The logo is the ClashETA wordmark with the E cut into three lanes: cyan, magenta and gold, the builder, lab and pet colours from `styles/tokens.css`. The letters are outlines, so there's no font file for it.

```
brand/
  wordmark-dark.svg, wordmark-light.svg   full logo for dark and light backgrounds
  mark.svg                                the E alone, transparent
  icon.svg                                rounded tile, for the site icons and the Android launcher icon
  icon-small.svg                          favicon: bigger E, wider slits so it holds at 16 px
  icon-flat.svg, icon-maskable.svg        square tiles for iOS and Android's adaptive icons
  og-image.html, og-shots/                source of the social preview and the screenshots in it
```

`npm run brand` turns these into `public/favicon.svg`, `favicon.ico` (16, 32, 48), `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` and `icon-maskable-512.png`. The outputs are committed, so a deploy doesn't run it. The Android launcher icons and splash are drawn from the same sources by `scripts/android-project.mjs` on every app build, so they need no step here.

`public/og-image.png` (1200 x 630) comes from `brand/og-image.html` with `npm run og`, which needs Playwright (see `docs/screenshots.md`). The text stays in the middle 630 px so X, iMessage and LinkedIn crops don't cut it.

The header logo is `src/ui/Logo.astro`. It's the same outlines, with the letters in the text colour and the lanes in the three accent variables, so it follows dark and light mode.

Social previews need absolute URLs. `astro.config.mjs` sets `site` to `https://clasheta.vercel.app`. To use another domain, set `SITE_URL` on the host. Without an absolute `site`, `og:image` is a relative path and scrapers ignore it.
