import type { ReactNode } from "react";
import styles from "../AboutSheet.module.css";

export function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={`about-${id}`} className={styles.block}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}
