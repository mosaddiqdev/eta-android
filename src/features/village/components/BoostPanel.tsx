import { ITEMS } from "../../../engine/items";
import { formatClock } from "../../../engine/time";
import { artUrl } from "../../../game/art";
import { artKey } from "../../../game/images";
import { Disclosure } from "../../../ui/Disclosure";
import type { PotionUse, Scenario } from "../../../village/scenario";
import type { Account } from "../../../village/types";
import { ArtImage } from "./ArtImage";
import styles from "./BoostPanel.module.css";
import { ClockTowerCard } from "./ClockTowerCard";
import { HelperCard } from "./HelperCard";
import { PotionCard } from "./PotionCard";

const CARDS: { id: string; source: PotionUse["source"]; lane: PotionUse["lane"] }[] = [
  { id: "builderPotion", source: "potion", lane: "builder" },
  { id: "builderBite", source: "snack", lane: "builder" },
  { id: "researchPotion", source: "potion", lane: "lab" },
  { id: "studySoup", source: "snack", lane: "lab" },
  { id: "petPotion", source: "potion", lane: "pet" },
];

interface Props {
  account: Account;
  scenario: Scenario;
  now: number;
  onPotion: (use: Omit<PotionUse, "at">) => void;
  onOpenUpgrade: (key: string) => void;
}

export function BoostPanel({ account, scenario, now, onPotion, onOpenUpgrade }: Props) {
  const { boosts, exportedAt } = account;
  const running = [
    { id: "builderPotion", seconds: boosts.builder },
    { id: "builderBite", seconds: boosts.builderSnack },
    { id: "researchPotion", seconds: boosts.lab },
    { id: "studySoup", seconds: boosts.labSnack },
    { id: "petPotion", seconds: boosts.pet },
  ]
    .map((boost) => ({ ...boost, left: exportedAt + boost.seconds - now }))
    .filter((boost) => boost.seconds > 0 && boost.left > 0);

  const { clockTower } = account;
  const towerLeft = exportedAt + boosts.clockTower - now;

  const cards = (source: PotionUse["source"]) =>
    CARDS.filter((card) => card.source === source).map(({ id, lane }) => {
      const item = ITEMS.find((i) => i.id === id);
      const present =
        lane === "builder"
          ? account.capacity.builder
          : lane === "lab"
            ? account.capacity.lab
            : account.capacity.pet;
      return item && present ? (
        <PotionCard
          key={id}
          item={item}
          source={source}
          lane={lane}
          account={account}
          scenario={scenario}
          onSet={onPotion}
        />
      ) : null;
    });

  return (
    <div className={styles.panel}>
      <section>
        <h3>Running now</h3>
        {running.length || (clockTower && towerLeft > 0) ? (
          <ul className={styles.running}>
            {running.map((boost) => {
              const item = ITEMS.find((i) => i.id === boost.id);
              return item ? (
                <li key={boost.id}>
                  <img src={artUrl(`items/${item.art}`)} alt="" width={28} height={28} />
                  <span>{item.label}</span>
                  <strong>{formatClock(boost.left)} left</strong>
                </li>
              ) : null;
            })}
            {clockTower && towerLeft > 0 && (
              <li>
                <ArtImage imageKey={artKey(clockTower.image, clockTower.level)} kind="building" size={28} />
                <span>{clockTower.name}</span>
                <strong>{formatClock(towerLeft)} left</strong>
              </li>
            )}
          </ul>
        ) : (
          <p className={styles.none}>No potions or snacks are running.</p>
        )}
      </section>

      <section>
        <h3>Helpers</h3>
        <div className={styles.stack}>
          <HelperCard kind="builder" account={account} scenario={scenario} now={now} onOpen={onOpenUpgrade} />
          <HelperCard kind="lab" account={account} scenario={scenario} now={now} onOpen={onOpenUpgrade} />
        </div>
      </section>

      {clockTower && (
        <section>
          <h3>Builder Base</h3>
          <ClockTowerCard account={account} scenario={scenario} now={now} />
        </section>
      )}

      <section>
        <h3>Use a potion now?</h3>
        <div className={styles.stack}>{cards("potion")}</div>
        <Disclosure
          className={styles.snacks}
          trigger={
            <>
              Snacks <span>2x and 4x, expire after 24h</span>
            </>
          }
        >
          <div className={styles.stack}>{cards("snack")}</div>
        </Disclosure>
      </section>
    </div>
  );
}
