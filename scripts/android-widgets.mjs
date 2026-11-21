import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Copies the home-screen widgets in scripts/android/widgets/ into the generated Android project. One folder per widget,
// plus `common/` for what they share (see the README there). A widget adds itself with no change to this file:
//   <widget>/java/*.java   -> the app's package, with __PACKAGE__ filled in
//   <widget>/res/**        -> the app's res/, merged (file names carry the widget's own prefix, so nothing collides)
//   <widget>/manifest.xml  -> inside <application>, once
// It also lists the Capacitor plugins the page talks to, so MainActivity registers them.

const ROOT = new URL("./android/widgets/", import.meta.url);

const folders = async () =>
  (await readdir(ROOT, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

/** Class names of the Capacitor plugins in the widgets: any java file called *Plugin.java. */
export async function widgetPlugins() {
  const found = [];
  for (const folder of await folders()) {
    const java = await readdir(new URL(`${folder}/java/`, ROOT)).catch(() => []);
    found.push(...java.filter((f) => f.endsWith("Plugin.java")).map((f) => f.replace(".java", "")));
  }
  return found;
}

export async function installWidgets({ dir, pkg, res, manifestFile }) {
  let manifest = await readFile(manifestFile, "utf8");
  for (const folder of await folders()) {
    const base = new URL(`${folder}/`, ROOT);
    for (const name of (await readdir(new URL("java/", base)).catch(() => [])).filter((f) =>
      f.endsWith(".java"),
    )) {
      const java = await readFile(new URL(`java/${name}`, base), "utf8");
      await writeFile(path.join(dir, name), java.replaceAll("__PACKAGE__", pkg));
    }
    const resources = new URL("res/", base);
    if ((await readdir(resources).catch(() => null)) !== null) {
      await mkdir(res, { recursive: true });
      await cp(resources, res, { recursive: true });
    }
    const fragment = await readFile(new URL("manifest.xml", base), "utf8").catch(() => null);
    if (!fragment) continue;
    const marker = /android:name="([^"]+)"/.exec(fragment)?.[1];
    if (marker && !manifest.includes(`android:name="${marker}"`))
      manifest = manifest.replace("</application>", `${fragment.trim()}\n    </application>`);
  }
  await writeFile(manifestFile, manifest);
}
