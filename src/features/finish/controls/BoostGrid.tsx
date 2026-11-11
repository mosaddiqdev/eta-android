import type { BoostItem, UpgradeKind } from "../../../engine/items";
import { BoostCard } from "./BoostCard";
import styles from "./BoostGrid.module.css";

interface Props {
  kind: UpgradeKind;
  items: BoostItem[];
  counts: Record<string, number>;
  onChange: (id: string, count: number) => void;
}

export function BoostGrid({ kind, items, counts, onChange }: Props) {
  return (
    <section aria-label="Boosts you used">
      {/* Keyed by tab, so switching tabs swaps the cards outright instead of animating one tab's counts into the next. */}
      <div key={kind} className={styles.grid}>
        {items.map((item) => (
          <BoostCard
            key={item.id}
            item={item}
            count={counts[item.id] ?? 0}
            onChange={(count) => onChange(item.id, count)}
          />
        ))}
      </div>
    </section>
  );
}
