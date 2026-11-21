import { readdir, readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

// A home-screen widget's layout is inflated by the launcher through RemoteViews, which allows only a short list of view
// classes. One plain <View> (an easy way to make a spacer) makes the launcher show "Problem loading widget", and nothing
// in the build notices. This reads every widget layout and fails on a class outside the list.
const ALLOWED = new Set([
  "FrameLayout",
  "LinearLayout",
  "RelativeLayout",
  "GridLayout",
  "ImageView",
  "ImageButton",
  "TextView",
  "Button",
  "Chronometer",
  "TextClock",
  "ProgressBar",
  "ViewFlipper",
  "AdapterViewFlipper",
  "ListView",
  "GridView",
  "StackView",
  "ViewStub",
  "AnalogClock",
]);

const root = new URL("./android/widgets/", import.meta.url);

async function layouts() {
  const found = [];
  for (const folder of await readdir(root, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const dir = new URL(`${folder.name}/res/layout/`, root);
    for (const name of await readdir(dir).catch(() => [])) found.push([`${folder.name}/${name}`, dir, name]);
  }
  return found;
}

describe("widget layouts", async () => {
  const all = await layouts();
  it("has layouts to check", () => expect(all.length).toBeGreaterThan(0));
  it.each(all)("%s uses only classes RemoteViews can inflate", async (_label, dir, name) => {
    const xml = await readFile(new URL(name, dir), "utf8");
    const tags = [...xml.replaceAll(/<!--[\s\S]*?-->/g, "").matchAll(/<([A-Za-z][\w.]*)/g)].map((m) => m[1]);
    expect(tags.filter((tag) => !ALLOWED.has(tag))).toEqual([]);
  });
});
