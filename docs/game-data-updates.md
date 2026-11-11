# Game data updates

New buildings, levels, troops and Town Halls reach the app through one npm package, [`clash-of-clans-data`](https://github.com/chiefpansancolt/clash-of-clans-data). Nothing is downloaded from Supercell. The package holds the data and the art, and `npm run data` turns them into the catalog and the resized pictures.

## How a game update reaches the site

1. Supercell ships an update. Some time later the package maintainer publishes a new version. That's manual and irregular (a burst in April 2026, nothing until late September, then early and late October), so the site is always days or weeks behind the game and nothing here can change that.
2. Every day the **Update game data** workflow (`.github/workflows/update-game-data.yml`) compares the pinned version with npm. If npm has a newer one that's been out at least 3 days, and no branch for it exists yet, the workflow installs it, rebuilds the data, and runs lint, type-check, tests and a full build. The 3-day wait is `COOLDOWN_DAYS` in `scripts/check-data-version.mjs`. The package sometimes patches a release within days, and the wait skips those.
3. If everything passes, it opens a pull request listing what changed: removed items first, then new items, new levels, retimed upgrades, and items with no picture. Vercel builds a preview of the PR.
4. You open the preview, look at a few upgrades, and merge. `npm run build` runs `npm run data` itself, so the host needs no extra setting.
5. If something fails, it opens an issue (one per version) with a link to the run and leaves the site alone.

A failed build on the host never replaces the live site. The last good deploy stays up.

The workflow installs with `--ignore-scripts`. The job holds a token that can push, and a dependency's install script shouldn't get near it.

`npm run data` also writes `src/game/data/meta.json`: the package version, the day npm published it, and the day the data was built. Settings shows the version and how long ago it was released. The build day resets on every deploy, so it says nothing about freshness. About › Credits shows both days, the second as "Site last built". The npm lookup is best effort. With no network the publish date is `null`, the line is left out, and the build still succeeds.

## Everything else

`.github/dependabot.yml` covers the other dependencies (Astro, React, the build tools, the GitHub Actions versions). It opens one pull request a week for minor and patch updates together, and one each for major updates, each only once the version is 3 days old. `clash-of-clans-data` is left out because the workflow above handles it. CI runs on those pull requests, so you merge on green.

## What needs no code change

- A new level of an existing item. Its build time and its picture (`name@<level>`) come from the package.
- A new item in a folder the script already reads. It gets a catalog entry and pictures.
- A new Town Hall. The village crest looks up the player's level.
- Until you merge, a player with something the catalog doesn't know yet still sees it with the right timer. Unknown items show as `Unknown #id` in the right lane, and a level past the data shows the newest picture there is.

## What does need a person

| Situation                                     | What you see                                                                   | Fix                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| The package adds a new data folder            | The build fails and names the folder                                           | Add it to `KIND_OF_FOLDER` or `IGNORED_FOLDERS` in `scripts/build-game-data.mjs` |
| The game adds a section to the village export | Import warning: upgrades running under "<section>", which the app doesn't read | Add the section to `SECTIONS` in `src/village/parse.ts`                          |
| The package lacks an item the game has        | `Unknown #id` with a timer                                                     | Wait for the package, or report it upstream                                      |
| The package ships data before its art         | Placeholder icon, listed under "No picture" in the PR                          | Wait for the next package version                                                |
| The package drops or renames an item          | Listed under "Removed" in the PR                                               | Look before merging                                                              |

## Tests and the frozen catalog

Tests for parsing and planning use `src/test/catalog.snapshot.json`, a frozen copy of the catalog. A balance patch (a shorter build time than an old fixture export had left, say) can't fail them unless there's a bug. Tests of the generated data (`src/game/game.test.ts`) use the live catalog and only assert things that stay true, like "at least 20 Mortar levels". Refresh the snapshot only when a fixture needs ids it doesn't have: copy `src/game/data/catalog.json` over it.

## One-time setup

Settings > Actions > General > Workflow permissions: tick "Allow GitHub Actions to create and approve pull requests". Without it the workflow can't open the PR.

## Running it by hand

Actions tab > Update game data > Run workflow. To skip a version, close its pull request. The branch `game-data/<version>` stays, so the version isn't proposed again. Delete the branch to get it proposed again.

GitHub turns off scheduled workflows in a repository with no activity for 60 days, and this package can go months without a release. The workflow re-enables itself on every run to reset that clock. If the schedule stops anyway, run it once by hand.

## Turning on auto-merge later

The steps are in the comment at the top of `.github/workflows/update-game-data.yml`. In short: allow auto-merge in the repository settings, make the CI check required on the default branch, open the PR with a token that can start workflows (the default one can't), and add a `gh pr merge --auto --squash` step.
