import { artUrl } from "../../../game/art";
import styles from "./GoblinPill.module.css";

interface Props {
  /** The lab's extra worker is a Goblin Researcher; every other lane's is a Goblin Builder. */
  researcher: boolean;
}

/**
 * Says the upgrade is being done by a Goblin worker, the extra one that comes on top of the regular builders or the
 * lab. It sits with the other pills at the bottom of the row, cut the same way as the helper pill: the gem
 * (the picture for a Goblin worker) in a ring, then a small label and its name. There is no clock here, because the goblin works as long as the upgrade
 * does, so the ring stays a calm, full track.
 */
export function GoblinPill({ researcher }: Props) {
  const name = researcher ? "Goblin Researcher" : "Goblin Builder";
  return (
    <span className={styles.pill}>
      <span className={styles.face} aria-hidden="true">
        <img src={artUrl("helpers/gem")} alt="" width={24} height={24} draggable={false} />
      </span>
      <span className={styles.text} aria-hidden="true">
        <span className={styles.label}>Extra worker</span>
        <span className={styles.name}>{name}</span>
      </span>
      <span className="sr-only">{name}, an extra worker</span>
    </span>
  );
}
