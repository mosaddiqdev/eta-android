import type { ReactNode } from "react";
import styles from "./SettingsSheet.module.css";

/** A titled card of related settings. */
export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.group}>
      <h3>{title}</h3>
      <div className={styles.card}>{children}</div>
    </section>
  );
}
