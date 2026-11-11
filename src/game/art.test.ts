import { expect, test } from "vitest";
import { ITEMS, KINDS } from "../engine/items";
import { artUrl } from "./art";

test("every picture the pages ask for exists and has a hashed name", () => {
  const names = [
    ...ITEMS.map((item) => `items/${item.art}`),
    ...KINDS.map(({ id }) => `icons/${id}`),
    "hero/lab",
    "hero/builder",
    "hero/pet",
    "guide/settings-tab",
    "guide/data-export",
    "helpers/builders_apprentice",
    "helpers/lab_assistant",
    "helpers/gem",
    "about/town_hall",
    "about/clock_tower",
  ];
  for (const name of names) expect(artUrl(name), name).toMatch(/\.webp/);
});
