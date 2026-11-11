# To check

Nothing here stops the app from working.

## Confirm in the game

- A helper adds its level as extra speed. Level 8 is +8x, so 18x with a Builder Potion.
- A recurrent helper ("keep assigned") restarts by itself when the 23h cooldown ends, even while you're away.
- Both helpers share one cooldown. Both sample exports show the same number.
- The Lab Assistant doesn't help the Pet House. No export shows helper fields on a pet.
- Guardians are upgraded by a builder.
- Study Soup also speeds up the Pet House. The in-game item text says so.
- Clock Tower multiplier: the data package says 10x at every level and a 2023 guide says 8x. The app follows the package.
- Clock Tower cooldown: it's unclear whether it starts when the boost is activated or when it ends. My village waits for the cooldown in the export and for a running boost to end, and plans one use.
- The Clock Tower also speeds up Star Laboratory research and the Master Builder. The app applies it to both. Confirm a Star Lab upgrade finishes sooner while it runs.

## Needs a real export

- First builds: I treat `lvl: 0` with a timer as a building under construction (shown as level 1, muted). No sample export has one, so I can't tell if the game writes 0 or 1.
- Crafting Station modules show one picture per defense. A module's level isn't the defense's level, so there's nothing to pick a level from. Module timers are parsed but I've never seen one in a real export.
- `gear_up` is read as a lasting "this building is geared up" state, because geared-up defenses are listed with it and no timer (sample 2: Cannon, Archer Tower, Mortar). A timer on a flagged building counts as a level upgrade of that building, unless `src/village/gear.ts` rules it out: the timer is longer than the next level takes, or there is no next level, and it fits the gear up's own duration. When it fits both, it's read as the level upgrade. I haven't seen an export taken during a gear up, so I don't know how the game marks one.
- While a gear up runs, the app shows the normal picture now and the geared-up one after. I haven't confirmed the game keeps the normal look.
- Goblin Builder and Goblin Researcher: I read `extra: true`, but neither sample export had one.
- Builder Base: the number of free workers can't be worked out, so it only shows busy ones.

## Missing from clash-of-clans-data

The package is the only source, so anything it lacks shows as `Unknown #id` with its timer and a warning. Worth reporting upstream:
- B.O.T.O's Shack (1000047, Builder Base). Both sample exports contain it.
- Sour Elixir Cauldron (1000083).
- Event and Super troops, and two event spells. They can't be upgraded, so exports shouldn't list them.
- The helper boost duration. The build script sets one hour for both speed helpers.

## Real devices

- Clipboard paste on iOS and Android. The paste box is the fallback.
- A foldable unfolded and a tablet in portrait. The two-pane layout starts at 48rem.
- 320px phones, for the summary tiles and upgrade rows.

## Other

- Every item in the catalog has a picture. Where the art is older than the data (Mortar has 20 levels and 18 pictures) the package repeats the newest one.
- `image-manifest.json` is 140 KB (20 KB gzipped) and loads with My village. If that starts to matter, split it per group and load on demand.
- Finish time and My village share no state. That's deliberate for now.
- Supercell's fan policy says not to modify its art, and I resize it to 128px. Use the official fan kit if you can.
- Keep the "unofficial, not endorsed by Supercell" footer, keep the site non-commercial, and keep "Clash of Clans" and "Supercell" out of any domain name.
- Test fixtures use made-up tags (#TEST1, #TEST2). The real exports weren't kept.
