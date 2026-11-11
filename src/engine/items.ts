export const HOUR = 3600;

export type UpgradeKind = "builder" | "lab" | "pet";

export interface BoostItem {
  id: string;
  label: string;
  type: "potion" | "snack";
  /** Speed added on top of the normal 1x. */
  bonus: number;
  works: UpgradeKind[];
  /** File name in src/assets/items, without extension. */
  art: string;
}

export const KINDS: { id: UpgradeKind; label: string; applies: string }[] = [
  { id: "builder", label: "Builder", applies: "Buildings and heroes" },
  { id: "lab", label: "Lab", applies: "Laboratory research" },
  { id: "pet", label: "Pet House", applies: "Pet House upgrades" },
];

// Within one kind the potion comes first: Finish time counts "potions needed" from index 0.
export const ITEMS: BoostItem[] = [
  {
    id: "builderPotion",
    label: "Builder Potion",
    type: "potion",
    bonus: 9,
    works: ["builder"],
    art: "builder_potion",
  },
  {
    id: "builderBite",
    label: "Builder Bite",
    type: "snack",
    bonus: 1,
    works: ["builder"],
    art: "builder_bite",
  },
  {
    id: "researchPotion",
    label: "Research Potion",
    type: "potion",
    bonus: 23,
    works: ["lab"],
    art: "research_potion",
  },
  { id: "petPotion", label: "Pet Potion", type: "potion", bonus: 23, works: ["pet"], art: "pet_potion" },
  // The game's own description says Study Soup speeds up both the Laboratory and the Pet House.
  { id: "studySoup", label: "Study Soup", type: "snack", bonus: 3, works: ["lab", "pet"], art: "study_soup" },
];

export const speedOf = (item: BoostItem) => 1 + item.bonus;

export const itemsFor = (kind: UpgradeKind) => ITEMS.filter((item) => item.works.includes(kind));

/** Each kind keeps its own counts, so Study Soup in the Lab doesn't leak into the Pet House. */
export function initialCounts() {
  const counts = {} as Record<UpgradeKind, Record<string, number>>;
  for (const { id: kind } of KINDS) {
    counts[kind] = Object.fromEntries(
      itemsFor(kind).map((item) => [item.id, item.type === "potion" ? 1 : 0]),
    );
  }
  return counts;
}
