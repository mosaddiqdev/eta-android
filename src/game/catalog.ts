import raw from "./data/catalog.json";

export type CatalogKind = "building" | "trap" | "troop" | "hero" | "pet" | "spell" | "guardian";

export interface CatalogEntry {
  name: string;
  kind: CatalogKind;
  village: "home" | "builderBase";
  /** Key into image-manifest.json, or null when the data package has no picture. */
  image: string | null;
  /** Base upgrade seconds, index 0 is level 1. */
  levels: number[];
  /** Picture of a geared-up defense in its active mode, shown while it is being geared up. */
  gearUpImage?: string;
  /** How long the gear up itself takes. Only for defenses that can be geared up. */
  gearUpSeconds?: number;
  /** A Crafting Station module rather than a normal building. */
  crafting?: boolean;
}

export interface HelperDef {
  id: number;
  name: string;
  image: string | null;
  levels: { seconds: number; multiplier: number }[];
}

export interface Catalog {
  /** The data package and version the catalog was built from. */
  source: string;
  get(id: number): CatalogEntry | undefined;
  helper(id: number): HelperDef | undefined;
  /** The Builder Base Clock Tower: per level, how long a boost lasts and the speed it adds. */
  clockTower(): HelperDef | undefined;
}

export function createCatalog(data: {
  source: string;
  entries: Record<string, CatalogEntry>;
  helpers: HelperDef[];
  clockTower?: HelperDef;
}): Catalog {
  return {
    source: data.source,
    get: (id) => data.entries[id],
    helper: (id) => data.helpers.find((helper) => helper.id === id),
    clockTower: () => data.clockTower,
  };
}

/** The generated game data, as a ready catalog. Import this module lazily; the JSON is ~54 KB. */
export const gameCatalog = createCatalog(raw as unknown as Parameters<typeof createCatalog>[0]);
