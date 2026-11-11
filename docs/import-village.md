# Import village: how it works

My village reads the JSON a player copies from the game's settings and answers three things: when each worker finishes, who is idle, and what a potion or helper would change. It all runs in the browser. The export is never uploaded.

## Data flow

```
pasted text ──parseExport──▶ Account ──buildPlan(scenario)──▶ Plan ──▶ UI
                  ▲                          ▲
             game catalog               potions / helpers the
        (ids → names, level times)      player is thinking about
```

- `src/game/` knows the game: names, level durations, helper levels, picture URLs.
- `src/village/` is plain TypeScript with no React and no browser APIs. Every rule has a test.
- The UI only draws a `Plan`.

`parseExport` rejects pasted text over 5 million characters and tags over 64 characters before doing anything else.

## Time model

Every duration in an export is "seconds left when the file was written". My village takes the export time as zero and projects forward from there, so an old paste still works: a recurrent helper keeps cycling and a finished upgrade shows `likelyDone`. Things the game didn't write down, like a potion used since, come in through a `Scenario`.

Speed at any moment is `1 + the bonus of every window that covers it`. A finish is found by walking constant-speed stretches until the work is used up (`windows.ts`, checked against a second-by-second simulation in the tests).

| Source                                        | Bonus          | Window                                          |
| --------------------------------------------- | -------------- | ----------------------------------------------- |
| Builder Potion / Research Potion / Pet Potion | +9 / +23 / +23 | from now for `*_boost` seconds                  |
| Builder Bite / Study Soup                     | +1 / +3        | `builder_consumable` / `lab_consumable` seconds |
| Builder's Apprentice / Lab Assistant          | +level         | `helper_timer` now, then every 23h if recurrent |
| Clock Tower (Builder Base)                    | +9 (10x)       | `clocktower_boost` seconds                      |

Using more of the same item makes its window longer. It never raises the bonus. Potions don't touch helpers but they stack with them: a Builder Potion plus a level 8 Apprentice is 1 + 9 + 8 = 18x.

## Lanes

| Lane             | Sections                                                         | Workers                       |
| ---------------- | ---------------------------------------------------------------- | ----------------------------- |
| builder          | buildings, traps, heroes, guardians (+ Crafting Station modules) | Builder's Huts + B.O.B's Hut  |
| lab              | units, siege_machines, spells                                    | 1 Laboratory                  |
| pet              | pets                                                             | 1 Pet House                   |
| bbBuilder, bbLab | buildings2, traps2, heroes2 / units2                             | not derivable from the export |

Goblin Builder and Goblin Researcher (`extra: true`) are extra workers on top of a lane. They never count against idle workers, and potions affect them like any other worker.

## Helpers

- One boost lasts 1h, then a shared 23h cooldown starts from when it was assigned. `helper_cooldown` is the time left on that cooldown.
- `helper_timer` is the seconds of the current boost left on this upgrade.
- `helper_recurrent` means "keep assigned until the upgrade is complete". The helper starts again by itself each time the cooldown ends, which the app models as windows at `cooldown + k × 23h`.
- A helper can only be on one upgrade. If an export claims two, the active one wins and the app warns.

## What `plan.ts` and `potion.ts` answer

- `buildPlan`: finish time per upgrade, a summary per lane (busy, idle, next free), a timeline of events (finishes, boosts ending, helper ready), and insights (idle builders, a boost running with nothing to boost, an old export).
- `potionImpact`: for a potion or snack used at a given moment, how much work it adds per upgrade, how much finish time it saves, and how much of the potion is wasted. Efficiency is counted in work, because a later helper hour can make the finish move less than the work gained.
- `potionOutlook`: the same at now and at every moment a worker frees up.
- `helperOptions`: which upgrade gains most from the helper, used once and kept assigned.

## Assumptions

These are listed with the other open questions in `docs/TO-CHECK.md`: helpers add their level as speed, a recurrent helper restarts on its own, the cooldown is shared, the Lab Assistant skips the Pet House, guardians use a builder, `extra: true` marks goblin work, and Study Soup speeds up the Pet House. The Clock Tower is 10x at every level and lasts 14 to 32 minutes depending on level, per clash-of-clans-data. Supercell's 2020 notes agree, a 2023 guide says 8x. The build script reads both per level, so a game update that changes them arrives with the package.

## Game data and pictures

`npm run data` (`scripts/build-game-data.mjs`) reads the pinned `clash-of-clans-data` package, which is the only source, and writes these generated, git-ignored files. `npm run dev`, `npm test` and `npm run build` run it first (see `docs/game-data-updates.md`).
- `src/game/data/catalog.json` (54 KB): id to name, kind, village, level durations and fallback picture key.
- `src/game/data/image-manifest.json`: picture key to hashed URL. Keys like `group/name@<level>` are the picture of one exact level (see "Pictures per level" in `docs/game-data-and-art.md`).
- `public/game/**.webp`: about 1,275 pictures, one per distinct look of each level, at most 128px on the long side, about 5.5 MB in all.

`levels[n]` is the time to reach level `n + 1`, so level 1 of a unit is 0 and an upgrade from level `L` uses `levels[L]`. I checked this against real timers: the Electro Dragon in sample 2 going from level 6 to 7 has 776,691 s left against 777,600 s in the data.

Picture loading (`src/game/images.ts`, `src/game/preload.ts`, `src/game/art.ts`):
1. Only pictures of items in the imported account are requested.
2. Files have content-hashed names and ship inside the app. The site's own pictures (`src/assets`) get the same from the build, through `artUrl()`.
3. A registry of what has decoded this session stops remounts from flashing (`preload.ts`). It holds no picture list, so the Finish time page can use it without loading the 133 KB manifest in `images.ts`.
4. Only the My village page imports the catalog, so the Finish time bundle doesn't grow.

Nine items have no picture in the package (Helper Hut, Crafting Station, B.O.B's Hut, the Builder Base Army Camp and a few others), so the UI draws a fallback icon per kind.

## Clock Tower

It's free, runs 14 to 32 minutes depending on level, and sits on a cooldown, so the app treats it like a helper: a card in the Boosts tab and a "ready again" moment in the Schedule. It speeds up everything in the Builder Base that has a timer in the export, which is the Master Builder's upgrades (`bbBuilder`) and the Star Laboratory (`bbLab`).
- `boosts.clocktower_boost` is the seconds of a boost running at export time. `boosts.clocktower_cooldown` is the seconds until it can be used again (the 22 hour cooldown from Supercell's 2020 notes, counted down).
- The level comes from the Clock Tower (id 1000039) in `buildings2`. The highest level wins.
- The card only shows state: running, ready now, ready later. There's no plan button. The scenario engine can still add one use at the moment it's ready (`rates.ts`, `clockTowerOutlook` in `potion.ts`, with tests), but nothing in the UI sets it. It never plans a second use, because the data doesn't say whether the cooldown starts at activation or at the end of the boost.
- The Clock Tower Potion (30 minutes, ignores the cooldown) isn't in the export, so it isn't planned.
