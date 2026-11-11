import { createCatalog } from "../game/catalog";
import snapshot from "./catalog.snapshot.json";

/**
 * A frozen copy of the game catalog (clash-of-clans-data 0.19.0), for tests of parsing and planning.
 *
 * The live catalog changes with every game update: a balance patch can shorten a build time below what
 * an old fixture export had left, which would fail a test without any bug in our code. Tests of the
 * generated data itself (src/game/game.test.ts) use the live catalog instead. Refresh this file only
 * when a fixture needs ids it doesn't have, by copying src/game/data/catalog.json over it.
 */
export const snapshotCatalog = createCatalog(snapshot as unknown as Parameters<typeof createCatalog>[0]);
