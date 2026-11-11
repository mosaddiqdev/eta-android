import { townHallImage } from "../../../game/images";
import { ArtImage } from "./ArtImage";
import styles from "./VillageCrest.module.css";

interface Props {
  townHall: number | null;
  size: "lg" | "md";
}

/** The Town Hall of a village at its own level, in place of a "TH18" label. The level stays available to screen readers. */
export function VillageCrest({ townHall, size }: Props) {
  return (
    <span
      className={styles.crest}
      data-size={size}
      role="img"
      aria-label={townHall ? `Town Hall ${townHall}` : "Village"}
    >
      <ArtImage imageKey={townHallImage(townHall)} kind="building" size={size === "lg" ? 40 : 34} />
    </span>
  );
}
