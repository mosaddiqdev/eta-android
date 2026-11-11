import type { ReactNode } from "react";
import styles from "./Collapse.module.css";

interface Props {
  open: boolean;
  children: ReactNode;
  id?: string;
  className?: string;
}

/**
 * Folds content away and back with a smooth height change, the way the "Used earlier?" drawer does. The content always
 * stays rendered, so there is nothing to measure and nothing to mount; it is only inert and invisible while shut.
 *
 * When the parent is a grid with a gap, a shut Collapse would still leave its gap behind. Set `--collapse-gap` on it
 * (same size as the parent's gap) and it takes that gap back while shut.
 */
export function Collapse({ open, children, id, className }: Props) {
  return (
    <div id={id} className={className ? `${styles.drawer} ${className}` : styles.drawer} data-open={open}>
      <div className={styles.clip} inert={!open}>
        <div>{children}</div>
      </div>
    </div>
  );
}
