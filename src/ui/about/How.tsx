import { ITEMS, KINDS, speedOf } from "../../engine/items";
import { artUrl } from "../../game/art";
import { COPY_STEPS, HELPER_CYCLE, HOUR } from "../../village/constants";
import styles from "../AboutSheet.module.css";
import { BoostTimeline } from "../BoostTimeline";
import { Art } from "./Art";
import { Block } from "./Block";

const kindLabel = Object.fromEntries(KINDS.map((kind) => [kind.id, kind.label]));

export function How() {
  return (
    <>
      <p className={styles.intro}>
        Two pages, one idea: the game runs an upgrade at 1x, and a boost makes it run faster for an hour.
        Everything here is arithmetic on that.
      </p>

      <Block id="finish" title="Finish time">
        <p>
          Use your potions in the game, then type how long the upgrade still has left here. Add what you used,
          and say if any of it started earlier. Now you can close the game: ClashETA shows when the upgrade
          ends, so you know when to open it again. It also shows how much time you saved and whether part of a
          boost would be left over.
        </p>
      </Block>

      <Block id="boosts" title="Boosts">
        <ul className={styles.rules}>
          <li>
            <Art name="items/builder_potion" kind="builder" />
            <strong>Same item, longer</strong>
            <p>Two Builder Potions give 2 hours at 10x. They do not give 1 hour at 20x.</p>
          </li>
          <li>
            <Art name="items/builder_bite" kind="builder" />
            <strong>Different items, faster</strong>
            <p>A Builder Potion and a Builder Bite together run at 11x, for as long as both last.</p>
          </li>
          <li>
            <Art name="helpers/builders_apprentice" />
            <strong>Helpers keep their pace</strong>
            <p>Potions do not speed up the Builder's Apprentice or the Lab Assistant.</p>
          </li>
        </ul>
        <ul className={styles.items}>
          {ITEMS.map((item) => (
            <li key={item.id}>
              <img src={artUrl(`items/${item.art}`)} alt="" width="40" height="40" loading="eager" />
              <span className={styles.itemName}>{item.label}</span>
              <span className={styles.itemWorks}>
                {item.works.map((kind) => kindLabel[kind]).join(" and ")}
              </span>
              <span className={styles.itemSpeed}>{speedOf(item)}x</span>
            </li>
          ))}
        </ul>
        <p className={styles.note}>
          Each potion or snack runs for 1 hour. Magic Snacks expire 24 hours after you get them.
        </p>
      </Block>

      <Block id="example" title="An example">
        <p>An upgrade has 30 hours left. You use 2 Builder Potions and 1 Builder Bite.</p>
        <div className={styles.example} data-kind="builder">
          <BoostTimeline
            left={30 * HOUR}
            uses={[
              { id: "builderPotion", count: 2 },
              { id: "builderBite", count: 1 },
            ]}
          />
          <p className={styles.result}>
            The first hour runs at 11x, the second at 10x, then the last 9 hours at normal speed. Done in{" "}
            <strong>11h</strong> instead of 30h.
          </p>
        </div>
      </Block>

      <Block id="village" title="My village">
        <p>
          In the game open <strong>{COPY_STEPS}</strong> and copy the export, then paste it into My village.
          It stays on your phone and goes nowhere else.
        </p>
        <dl className={styles.defs}>
          <div>
            <Art name="about/town_hall" kind="lab" />
            <dt>Timers start from the export</dt>
            <dd>
              Each countdown runs from the moment you copied it. If the export is old, upgrades that should
              have ended show a tick, and they are not counted as busy workers.
            </dd>
          </div>
          <div>
            <Art name="items/pet_potion" kind="pet" />
            <dt>Try a potion first</dt>
            <dd>
              In Boosts and helpers you can add a potion and see every finish time move before you use it for
              real.
            </dd>
          </div>
          <div>
            <Art name="helpers/lab_assistant" />
            <dt>Helpers</dt>
            <dd>
              The Builder's Apprentice and the Lab Assistant work for 1 hour each time. A helper can start
              again once {HELPER_CYCLE / HOUR} hours have passed since it was assigned.
            </dd>
          </div>
          <div>
            <Art name="about/clock_tower" />
            <dt>Builder Base</dt>
            <dd>
              There are no potions there. The Clock Tower is the only boost, and it speeds up both the Master
              Builder and the Star Laboratory.
            </dd>
          </div>
        </dl>
      </Block>

      <Block id="limits" title="Where it can be wrong">
        <p>
          This is a calculator. The game is always right. If you see a different time in the game, trust the
          game and paste a fresh export.
        </p>
        <p>
          When the community data and the game's own item text disagree, I follow the game. For example, Study
          Soup also speeds up the Pet House, so it does here.
        </p>
      </Block>
    </>
  );
}
