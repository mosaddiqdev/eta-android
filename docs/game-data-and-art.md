# Game data and art

## Item art

Every picture the site shows itself lives in `src/assets` and is read through `artUrl('items/builder_potion')` (`src/game/art.ts`). The build puts a content hash in each file name. The files ship inside the app, and the Finish time page and the import screen fetch their pictures while idle. A name that doesn't exist throws, and `art.test.ts` checks every name the pages use.

The five item images in `src/assets/items/` come from [clash-of-clans-data](https://github.com/chiefpansancolt/clash-of-clans-data) (`images/magic-items/`), resized to 256 px tall at most and saved as WebP. The tab icons in `src/assets/icons/` (Builder's Hut, Laboratory, Pet House) come from the same package's `images/home/`, cropped, shrunk to 112 px and saved as WebP. The bigger empty-state pictures in `src/assets/hero/` are cut from the originals by `scripts/build-hero-art.mjs`.

All of it is Supercell's art. The footer says so and carries the unofficial-fan-tool notice. Keep the site non-commercial. Supercell's Fan Content Policy bars domains, handles and similar addresses that use its trademarks or game names without a written agreement. The app's name has "Clash" in it, so read that policy before registering a domain or social account, and never use "Clash of Clans" or "Supercell" in one.

## Data sources

Item art, tab icons and the boost values (Builder Potion 10x, Research and Pet Potion 24x, Builder Bite 2x, Study Soup 4x, all for 1 hour) come from [clash-of-clans-data](https://github.com/chiefpansancolt/clash-of-clans-data) (MIT, v0.19.1). The package is built from the Clash of Clans Fandom wiki. It lists Study Soup as research only, but the in-game text says it also boosts Pet House upgrades, so the app follows the game.

The package has `boost()`, `gems()` and `clockTower()` calculators, but they cover other things (gem costs, one Clock Tower activation) and not stacked-boost finish times, so there's nothing in it to test the engine against. The Clock Tower's boost length and speed per level come from its data file.

The My village catalog (names, level times, helper levels) and its pictures are built from the same package by `npm run data`. It reads `node_modules/clash-of-clans-data`, resizes to 128 px and saves WebP.

### Pictures per level

Buildings, traps, units and siege machines change look as they level up, so the catalog keeps one picture per level (`group/name@<level>`) plus a fallback (`group/name`). Heroes, pets, spells and Crafting Station modules are drawn once. `src/village/art.ts` decides which picture an upgrade shows:

| Case                                           | Picture shown                                                                                                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Level x to y                                   | Level x in rows and the sheet header (the village looks like x until the timer ends). Level y in the sheet's "after" strip and on the Schedule's finish entries |
| First build (export level 0)                   | Level 1, washed out so it doesn't look finished (the data has no scaffolding art)                                                                               |
| Geared-up defense, level x to y                | Its geared-up picture of level x now and level y after, with a small gear by the name                                                                           |
| Gear up in progress                            | Normal picture now, geared-up picture after. The step reads "Gear up · Lv x" and the bar uses the gear up's own duration                                        |
| Level the art doesn't cover                    | The nearest older picture, else the oldest (`artKey` in `src/game/images.ts`)                                                                                   |
| Heroes, pets, spells, Crafting Station modules | Their single picture                                                                                                                                            |

Levels are read by position in the package's `levels` list, because the package mislabels a few (Mortar's last two levels say 1 and 2). Identical pictures are encoded once, so about 1,650 keys end up as about 1,275 files (5.5 MB). A village only requests the ones it shows. The package has no helper boost duration, so the script sets one hour. Items the package lacks show as unknown with their timer. See `docs/TO-CHECK.md`.

### After a game update

The generated game data (`src/game/data/`) and pictures (`public/game/`) aren't committed. `npm run dev`, `npm test` and `npm run build` build them first, so a deploy builds them from the `clash-of-clans-data` version pinned in `package-lock.json`. A GitHub Action checks npm every day and opens a pull request when the package has a newer version that's at least 3 days old. Dependabot (`.github/dependabot.yml`) handles the other dependencies once a week. You look at the preview and merge. Details and auto-merge setup are in `docs/game-data-updates.md`.
