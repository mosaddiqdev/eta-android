#!/usr/bin/env node
// Screenshot any web page (local or live) with headless Chromium. Docs: docs/screenshots.md
//
//   node scripts/screenshot.cjs <url> [<url> ...] [options]
//
// Options (all optional):
//   --out <dir>          where PNGs go                         (default ./shots)
//   --width <px>         viewport width                        (default 390)
//   --height <px>        viewport height                       (default 844)
//   --scale <n>          device pixel ratio (2 = retina)       (default 2 under 768px wide, else 1)
//   --scheme light|dark  prefers-color-scheme                  (default light)
//   --full-page          capture the whole scrollable page
//   --selector <css>     capture only this element
//   --click <text|css>   click something first (repeatable; text is matched as visible text, else CSS)
//   --wait <ms>          extra wait after load/clicks          (default 500)
//   --hide <css>         hide elements, e.g. cookie banners or dev toolbars (repeatable)
//   --no-animations      freeze CSS animations/transitions
//   --fonts              print which fonts loaded, and which family the page's text is rendered in
//   --timeout <ms>       navigation timeout                    (default 30000)
//   --name <file>        output file name, without .png        (default: derived from the URL)
//
// Prints: the saved path, console errors, failed requests, and a horizontal-overflow check.
const { chromium } = require("playwright");
const { mkdirSync } = require("node:fs");
const path = require("node:path");

const argv = process.argv.slice(2);
const flags = new Set(["full-page", "no-animations", "fonts", "help"]);
const urls = [];
const opt = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith("--")) {
    urls.push(a);
    continue;
  }
  const key = a.slice(2);
  if (flags.has(key)) opt[key] = true;
  else {
    opt[key] ??= [];
    opt[key].push(argv[++i]);
  }
}
const one = (k, d) => (opt[k] ? opt[k][opt[k].length - 1] : d);

if (opt.help || urls.length === 0) {
  console.log(
    require("node:fs")
      .readFileSync(__filename, "utf8")
      .split("\n")
      .slice(1, 24)
      .join("\n")
      .replace(/^\/\/ ?/gm, ""),
  );
  process.exit(urls.length === 0 && !opt.help ? 1 : 0);
}

const out = one("out", "shots");
const width = Number(one("width", 390));
const height = Number(one("height", 844));
const scale = Number(one("scale", width < 768 ? 2 : 1));
const scheme = one("scheme", "light");
const wait = Number(one("wait", 500));
const timeout = Number(one("timeout", 30000));
mkdirSync(out, { recursive: true });

const fileName = (url) => {
  const u = new URL(url);
  const slug = `${u.hostname}${u.pathname}`.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  return `${one("name", slug || "page")}-${width}-${scheme}.png`;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    colorScheme: scheme,
  });
  let failed = 0;
  for (const raw of urls) {
    const url = /^https?:\/\//.test(raw) ? raw : `http://${raw}`;
    const page = await ctx.newPage();
    const errors = [];
    const bad = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("requestfailed", (r) => bad.push(`FAILED ${r.url()}`));
    page.on("response", (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout });
      await page.evaluate(() => document.fonts.ready); // never shoot before webfonts finish
      if (opt["no-animations"])
        await page.addStyleTag({
          content: "*,*::before,*::after{animation:none!important;transition:none!important}",
        });
      for (const sel of opt.hide ?? []) await page.addStyleTag({ content: `${sel}{display:none!important}` });
      for (const target of opt.click ?? []) {
        const byText = page.getByText(target, { exact: false }).first();
        const el = (await byText.count()) ? byText : page.locator(target).first();
        await el.click({ timeout: 5000 });
      }
      await page.waitForTimeout(wait);

      const file = path.join(out, fileName(url));
      const sel = one("selector");
      if (sel) await page.locator(sel).first().screenshot({ path: file });
      else await page.screenshot({ path: file, fullPage: !!opt["full-page"] });
      console.log(`saved  ${file}`);

      const overflow = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      console.log(
        `  overflow: scrollWidth ${overflow[0]} / clientWidth ${overflow[1]}${overflow[0] > overflow[1] ? "  <-- page scrolls sideways" : "  ok"}`,
      );

      if (opt.fonts) {
        const loaded = await page.evaluate(() =>
          [...document.fonts].filter((f) => f.status === "loaded").map((f) => `${f.family} ${f.weight}`),
        );
        const used = await page.evaluate(() => {
          const pick = (s) => {
            const e = document.querySelector(s);
            return e ? getComputedStyle(e).fontFamily : "-";
          };
          return { body: pick("body"), heading: pick("h1,h2,h3"), button: pick("button") };
        });
        console.log(`  fonts loaded: ${[...new Set(loaded)].join(", ") || "none (system fonts only)"}`);
        console.log(`  font-family:  body=${used.body} | heading=${used.heading} | button=${used.button}`);
      }
      for (const e of [...new Set(errors)]) console.log(`  console error: ${e}`);
      for (const b of [...new Set(bad)]) console.log(`  bad request:   ${b}`);
    } catch (e) {
      failed++;
      console.error(`ERROR  ${url}: ${e.message.split("\n")[0]}`);
    }
    await page.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
})();
