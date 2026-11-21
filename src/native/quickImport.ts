import { registerPlugin } from "@capacitor/core";
import { readVillages, withVillage, writeVillages } from "../features/village/villages";
import { parseExport } from "../village/parse";
import { syncWidgetsNow } from "../widgets/sync";
import { readClipboardSoon } from "./clipboardImport";
import { syncNotificationsNow } from "./notificationSync";

// The page behind the "Import village" Quick Settings tile (EtaImportTile.java). It runs in EtaImportActivity, a
// see-through screen over the game: it reads the clipboard, saves the village the way the village page does, sets the
// alarms, shows a system toast and closes. The player never leaves Clash. Docs: docs/android.md

interface EtaImport {
  clipboard(): Promise<{ text: string }>;
  toast(options: { text: string }): Promise<void>;
  finish(): Promise<void>;
}
const EtaImport = registerPlugin<EtaImport>("EtaImport");
const nowSeconds = () => Math.floor(Date.now() / 1000);

async function importCopied(): Promise<string> {
  // The catalog loads while the clipboard is read. The screen read it natively when it got focus.
  const catalog = import("../game/catalog");
  const text = (await EtaImport.clipboard().catch(() => ({ text: "" }))).text || (await readClipboardSoon());
  if (!text) return "Nothing copied yet. Copy your village in Clash first.";
  const { gameCatalog } = await catalog;
  let tag: string;
  try {
    const { account } = parseExport(text, gameCatalog);
    tag = account.tag;
    const saved = readVillages();
    // The same export again changes nothing, as on the village page.
    if (saved.villages.some((v) => v.raw === text)) return `${tag} is already up to date`;
    writeVillages(withVillage(saved, account, text, nowSeconds()));
  } catch {
    return "That isn’t a village export. In Clash, copy it again.";
  }
  await Promise.all([syncNotificationsNow(), syncWidgetsNow()]);
  return `${tag} imported`;
}

async function main() {
  let message: string;
  try {
    message = await importCopied();
  } catch {
    message = "Couldn’t import. Open ClashETA and paste instead.";
  }
  await EtaImport.toast({ text: message }).catch(() => {});
  await EtaImport.finish().catch(() => {});
}

void main();
