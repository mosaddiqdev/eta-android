import { artUrl } from "../../game/art";
import styles from "../AboutSheet.module.css";
import { Art } from "./Art";
import { Block } from "./Block";

// The three potions the whole site is about, one for each lane's colour.
const SHELF = [
  { kind: "lab", art: "items/research_potion" },
  { kind: "builder", art: "items/builder_potion" },
  { kind: "pet", art: "items/pet_potion" },
] as const;

export function Story() {
  return (
    <>
      <div className={styles.hero}>
        <div className={styles.stage} aria-hidden="true">
          {SHELF.map((potion) => (
            <img key={potion.kind} data-kind={potion.kind} src={artUrl(potion.art)} alt="" loading="eager" />
          ))}
        </div>
        <h3 className={styles.headline}>I was opening the game just to read a timer.</h3>
        <p className={styles.lede}>
          ClashETA is an unofficial tool made by one player. Use a potion, close the game, and it tells you
          when the upgrade ends.
        </p>
      </div>

      <Block id="why" title="Why I made it">
        <p>
          Hammer Jam is the limited-time event when upgrades get cheaper and faster. I queue as much as I can
          and want every hour of every potion used. Last time I kept doing the same sum: before I left the
          game I worked out when each upgrade would end, and when I came back I worked it out again so I could
          start the next potion on time.
        </p>
        <p>
          I only knew roughly when things would finish, and the one way to be sure was to open the game. So I
          opened it just to read a timer. The game's notifications did not help, because they tell me about
          everything and I only care about an upgrade ending. I wanted one page that already knew. This year I
          built it.
        </p>
      </Block>

      <Block id="grew" title="How it grew">
        <ol className={styles.cards}>
          <li>
            <Art name="items/builder_potion" kind="builder" />
            <div>
              <strong>Finish time</strong>
              <p>
                Type the time an upgrade has left, add the boosts you used, and read when it ends. At first
                the site was only this.
              </p>
            </div>
          </li>
          <li>
            <Art name="about/town_hall" kind="lab" />
            <div>
              <strong>My village</strong>
              <p>
                While building Finish time I saw that the game's export already has every timer in it. So I
                added a page that reads the export and lists builders, lab and pets together, with helpers and
                potions worked in.
              </p>
            </div>
          </li>
        </ol>
      </Block>
    </>
  );
}
