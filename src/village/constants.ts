export const HOUR = 3600;

/**
 * Extra speed on top of the normal 1x: the multiplier clash-of-clans-data gives each item, minus the 1x that is always
 * there (Builder Potion 10x adds 9). Study Soup is 4x for research in the data; it is also applied to the Pet House
 * because the game's own item text says it works there (see "Where it can be wrong" in the About sheet).
 */
export const BONUS = {
  builderPotion: 9,
  builderSnack: 1,
  researchPotion: 23,
  studySoup: 3,
  petPotion: 23,
  // Only for a boost already running in an export that predates the catalog's Clock Tower data. The data
  // package says 10x at every level (Supercell's 2020 notes agree; a 2023 guide says 8x).
  clockTower: 9,
} as const;

/** A helper can start once per "workday": 23 hours counted from when it was assigned. */
export const HELPER_CYCLE = 23 * HOUR;

/** Catalog ids of the Builder's Hut and B.O.B's Hut; together they are the home village's builders. */
export const BUILDER_HUT_IDS = [1000015, 1000064];
export const TOWN_HALL_ID = 1000001;

/** The Builder Base Clock Tower, a building in the export's `buildings2` list. */
export const CLOCK_TOWER_ID = 1000039;

export const HELPER_IDS = { builder: 93000000, lab: 93000001 } as const;

/** Where the player finds the export in the game, for messages that tell them to copy it again. */
export const COPY_STEPS = "Settings › Data Export";
