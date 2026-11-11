# Taking screenshots of any page

`scripts/screenshot.cjs` opens a page in headless Chromium (Playwright), waits for webfonts and the network to settle,
and saves a PNG. It takes any URL: this app running locally, a deployed site, or someone else's page.

## One-time setup

You need Node 18+ and Playwright with a Chromium build.

```bash
npm install --save-dev playwright     # or: npm install -g playwright
npx playwright install chromium       # downloads the browser (~150 MB, once)
```

If Playwright and Chromium are already installed (some dev containers ship them), skip this.
The script is `.cjs` because the project is `"type": "module"`, and a `.mjs` file can't find a globally installed `playwright`.

## Quick start

```bash
# a live site, phone size
node scripts/screenshot.cjs https://example.com

# this app: build and serve it, then shoot
npm run build && npx astro preview --port 4399 &
node scripts/screenshot.cjs localhost:4399 localhost:4399/finish --fonts
```

PNGs land in `./shots/`. Each run prints where it saved and a short report (below).

## Options

| Option                           | Meaning                                                        | Default                      |
| -------------------------------- | -------------------------------------------------------------- | ---------------------------- |
| `--out <dir>`                    | Output folder                                                  | `./shots`                    |
| `--width <px>` / `--height <px>` | Viewport size                                                  | `390` x `844`                |
| `--scale <n>`                    | Pixel ratio (`2` = sharp on retina)                            | `2` if width < 768, else `1` |
| `--scheme light\|dark`           | `prefers-color-scheme`                                         | `light`                      |
| `--full-page`                    | Capture the whole scrollable page, not just the viewport       | off                          |
| `--selector <css>`               | Capture only one element (a card, a dialog, a header)          | off                          |
| `--click <text or css>`          | Click something first. Repeat for several clicks, in order     | none                         |
| `--hide <css>`                   | Hide elements (cookie banner, dev toolbar). Repeatable         | none                         |
| `--wait <ms>`                    | Extra wait after load and clicks (for toasts, animations)      | `500`                        |
| `--no-animations`                | Freeze CSS animations and transitions                          | off                          |
| `--fonts`                        | Report which webfonts loaded and which family text really uses | off                          |
| `--name <file>`                  | File name without `.png` (single URL only makes sense)         | from the URL                 |
| `--timeout <ms>`                 | Page load timeout                                              | `30000`                      |

You can pass several URLs in one run and they share the options. Files are named
`<host-and-path>-<width>-<scheme>.png`, so different widths and themes don't overwrite each other.

## Recipes

```bash
# Desktop, full page
node scripts/screenshot.cjs https://example.com --width 1366 --height 900 --full-page

# Dark mode on the smallest common phone (320px is where layouts break first)
node scripts/screenshot.cjs localhost:4399 --width 320 --scheme dark

# Just one component
node scripts/screenshot.cjs localhost:4399 --selector "header"

# Open a menu first, then shoot
node scripts/screenshot.cjs localhost:4399 --click "Settings" --wait 800

# Clean shot: no banners, no motion
node scripts/screenshot.cjs https://example.com --hide ".cookie-banner" --no-animations

# Check that custom fonts load
node scripts/screenshot.cjs localhost:4399 --fonts
```

## Reading the report

```
saved  shots/localhost-4399-390-light.png
  overflow: scrollWidth 390 / clientWidth 390  ok
  fonts loaded: Plus Jakarta Sans Variable 200 800
  font-family:  body=... | heading=... | button=...
  console error: ...
  bad request:   404 http://localhost:4399/missing.woff2
```

- **overflow**: if `scrollWidth` is bigger than `clientWidth`, the page scrolls sideways at that width.
- **fonts loaded** and **font-family**: if the family you designed for is not in "loaded", the page is showing a
  fallback. A font that is declared in CSS but never imported will not appear at all.
- **console error** and **bad request**: JavaScript errors, 404s and blocked requests, de-duplicated.

The exit code is `1` if any page failed to load, so it also works in scripts and CI.

## Using it on ClashETA

- Use a production build (`npm run build`, then `npx astro preview`). `npm run dev` adds a toolbar at the bottom of the
  page. If you use dev anyway, add `--hide astro-dev-toolbar`.
- Pages: `/`, `/finish`, `/village`.
- The village page starts empty. Click through with `--click "look around with a sample village" --wait 6500`,
  because an "Added" toast covers the bottom rows until it leaves.
- Check both themes (`--scheme light` and `dark`) and widths 320, 390 and 1366. Tokens are in `src/styles/tokens.css`.

## Troubleshooting

| Problem                                                    | Fix                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `Cannot find module 'playwright'`                          | Run the setup above, from the project folder (or install it globally)                |
| `Executable doesn't exist`                                 | `npx playwright install chromium`                                                    |
| `ERR_CONNECTION_REFUSED`                                   | The server is not running, or the port is wrong. Check with `curl -I localhost:4399` |
| `pkill -f "astro preview"` kills your own shell (exit 144) | Put a bracket in the pattern: `pkill -f "[a]stro preview"`                           |
| Timeout on a live site                                     | Some sites never go network-idle; raise `--timeout` or try a different URL           |
| Text looks blurry                                          | Use `--scale 2`                                                                      |
| Blank or half-drawn page                                   | Raise `--wait`, or add `--no-animations`                                             |
| Page behind a login                                        | This script does not sign in; use a public or local page                             |
| Blocked network (sandbox, corporate proxy)                 | Fetching external sites can fail; local servers still work                           |

## The README and social images

These come from real captures of the sample village. To keep them repeatable:
- Use a fresh browser context for each theme.
- Fix the clock at 9:41 (`page.clock.install`) so the page time matches the 9:41 in the phone frames.
- After loading the sample, advance the clock about 16 s so the "Added" toast is gone.
- Take the import screen without a fake clock, because its pictures load on idle.
- Capture phones at 390 x 844 at 3x (1170 x 2532) and laptops at 1440 x 900 at 2x. Finish time reads better at 1152 x 720 at 2.5x.
- Keep PNGs lossless and optimised, never palette-reduced. `public/og-image.png` is true colour too, and only drops to a palette if it would go past about 300 KB (`npm run og` decides).
