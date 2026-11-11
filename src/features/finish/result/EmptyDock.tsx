import { artUrl } from "../../../game/art";
import styles from "./EmptyDock.module.css";

const ART = ["builder_potion", "research_potion", "pet_potion"];

export function EmptyDock() {
  return (
    <div className={styles.empty}>
      <div className={styles.art} aria-hidden="true">
        {ART.map((name) => (
          <img key={name} src={artUrl(`items/${name}`)} alt="" draggable={false} />
        ))}
      </div>
      <p className={styles.text}>Enter the time left to see when your upgrade finishes.</p>
    </div>
  );
}
