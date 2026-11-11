import { Cog } from "lucide-react";
import styles from "./GearMark.module.css";

/** A small gear after a defense's name: it is geared up, or being geared up. The picture already shows how. */
export function GearMark({ size = 14 }: { size?: number }) {
  return (
    <span className={styles.mark} role="img" aria-label="Geared up" title="Geared up">
      <Cog size={size} aria-hidden="true" />
    </span>
  );
}
