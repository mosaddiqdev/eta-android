import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { artUrl } from "../../../game/art";
import { snapshotCatalog } from "../../../test/catalog";
import one from "../../../village/fixtures/account-1.json";
import two from "../../../village/fixtures/account-2.json";
import { parseExport } from "../../../village/parse";
import { planUpgrade } from "../../../village/plan";
import { emptyScenario } from "../../../village/scenario";
import { helperArtOf } from "../rows";
import { UpgradeRow } from "./UpgradeRow";

const { account } = parseExport(one, snapshotCatalog);
// The second export has a Builder Potion, a Research Potion and both helpers working when it was taken.
const second = parseExport(two, snapshotCatalog).account;

const render = (
  name: string,
  pick: (u: (typeof account.upgrades)[number]) => boolean,
  from: typeof account = account,
) => {
  const upgrade = from.upgrades.find((u) => u.name === name && pick(u));
  if (!upgrade) throw new Error(`fixture has no ${name}`);
  const scenario = emptyScenario(from.exportedAt);
  const planned = planUpgrade(upgrade, from, scenario);
  return renderToStaticMarkup(
    <UpgradeRow
      upgrade={planned}
      exportedAt={from.exportedAt}
      now={from.exportedAt}
      earlier={0}
      helperArt={helperArtOf(from.helpers, planned.lane)}
      onOpen={() => {}}
    />,
  );
};

describe("UpgradeRow", () => {
  it("marks a geared-up defense with a gear by its name, not a pill", () => {
    const html = render("Mortar", (u) => u.geared);
    expect(html).toContain('aria-label="Geared up"');
    expect(html).not.toContain("Gear Up");
  });

  it("shows what is speeding an upgrade up: the potion and the helper, in front-to-back order", () => {
    const html = render("Monolith", () => true, second);
    const potion = html.indexOf(artUrl("items/builder_potion"));
    const helper = html.indexOf(artUrl("helpers/builders_apprentice"));
    expect(potion).toBeGreaterThan(-1);
    expect(helper).toBeGreaterThan(potion);
    expect(html).toContain("from Builder Potion, Builder&#x27;s Apprentice");
  });

  it("uses the Research Potion and the Lab Assistant, not the builder's, for the lab", () => {
    const html = render("Electro Dragon", () => true, second);
    expect(html).toContain(artUrl("items/research_potion"));
    expect(html).toContain(artUrl("helpers/lab_assistant"));
    expect(html).not.toContain(artUrl("helpers/builders_apprentice"));
    expect(html).not.toContain(artUrl("items/builder_potion"));
  });

  it("shows the Clock Tower by a Builder Base upgrade it is speeding up, and by nothing it is not", () => {
    const base = structuredClone(two) as unknown as Record<string, unknown[]> & {
      boosts: Record<string, number>;
    };
    base.buildings2 = [
      { data: 1000039, lvl: 10, cnt: 1 },
      { data: 1000050, lvl: 5, timer: 40 * 3600 },
    ];
    base.units2 = [];
    const renderBase = (boosts: Record<string, number>) => {
      const { account: village } = parseExport({ ...base, boosts }, snapshotCatalog);
      const upgrade = village.upgrades.find((u) => u.lane === "bbBuilder");
      if (!upgrade) throw new Error("fixture changed");
      return renderToStaticMarkup(
        <UpgradeRow
          upgrade={planUpgrade(upgrade, village, emptyScenario(village.exportedAt))}
          exportedAt={village.exportedAt}
          now={village.exportedAt}
          earlier={0}
          helperArt={null}
          onOpen={() => {}}
        />,
      );
    };

    const running = renderBase({ clocktower_boost: 600 });
    expect(running).toContain(artUrl("about/clock_tower"));
    expect(running).toContain("from Clock Tower");
    expect(renderBase({ clocktower_cooldown: 600 })).not.toContain(artUrl("about/clock_tower"));
  });
});
