import meta from "./data/meta.json";

/** Where the game data came from, for the About card: written by `npm run data` next to the catalog. */
export const gameData = meta as {
  package: string;
  version: string;
  /** When npm published this version, or null if the build could not ask. */
  publishedAt: string | null;
  /** When this site's copy of the data was generated, which on a deploy is the day it was built. */
  builtAt: string;
};
