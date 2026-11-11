import { artUrl } from "../../game/art";
import styles from "../AboutSheet.module.css";

interface Props {
  /** A name in src/assets, like `items/builder_potion` or `about/clock_tower`. */
  name: string;
  /** Tints the tile with the builder, lab or pet colour. */
  kind?: "builder" | "lab" | "pet";
  /** Not built yet: the picture is washed out. */
  muted?: boolean;
}

/** A game picture on a soft tinted tile. Decorative, the text beside it says everything. */
export function Art({ name, kind, muted = false }: Props) {
  return (
    <span className={styles.art} data-kind={kind} data-muted={muted || undefined} aria-hidden="true">
      <img src={artUrl(name)} alt="" loading="eager" decoding="async" />
    </span>
  );
}
