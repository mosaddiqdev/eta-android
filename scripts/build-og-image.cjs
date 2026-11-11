// Builds public/og-image.png from brand/og-image.html: rendered at 2x, then scaled down to 1200 x 630 and saved as a
// true-colour PNG when that fits the budget, else a palette PNG (WhatsApp skips preview pictures much over about 300 KB). Needs Playwright, see docs/screenshots.md.
//   npm run og
const { chromium } = require("playwright");
const sharp = require("sharp");
const path = require("node:path");
const { statSync } = require("node:fs");

const src = path.resolve(__dirname, "../brand/og-image.html");
const out = path.resolve(__dirname, "../public/og-image.png");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
  await page.goto(`file://${src}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot();
  await browser.close();
  // True colour first; only if that is over the budget fall back to a 256-colour palette at the highest quality.
  const small = sharp(png).resize(1200, 630);
  const full = await small
    .clone()
    .png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10 })
    .toBuffer();
  const budget = 290 * 1024;
  const best =
    full.length <= budget
      ? full
      : await small.clone().png({ palette: true, quality: 100, effort: 10, dither: 1 }).toBuffer();
  require("node:fs").writeFileSync(out, best);
  console.log(`wrote ${path.relative(process.cwd(), out)} (${Math.round(statSync(out).size / 1024)} KB)`);
})();
