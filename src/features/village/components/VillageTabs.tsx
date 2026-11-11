import { CalendarClock, ListChecks, Zap } from "lucide-react";
import type { CSSProperties } from "react";
import styles from "./VillageTabs.module.css";

export type Tab = "workers" | "schedule" | "boosts";

const TABS = [
  { id: "workers", label: "Workers", icon: ListChecks },
  { id: "schedule", label: "Schedule", icon: CalendarClock },
  { id: "boosts", label: "Boosts", icon: Zap },
] as const;

/** In the order they sit, so a swipe knows which one is next. */
export const TAB_IDS: readonly Tab[] = TABS.map((tab) => tab.id);

interface Props {
  value: Tab;
  onChange: (tab: Tab) => void;
}

export function VillageTabs({ value, onChange }: Props) {
  return (
    <div
      className={styles.tabs}
      role="tablist"
      aria-label="My village views"
      style={{ "--i": TABS.findIndex((tab) => tab.id === value) } as CSSProperties}
    >
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`tab-${id}`}
          aria-selected={value === id}
          aria-controls={`panel-${id}`}
          className={styles.tab}
          onClick={() => onChange(id)}
        >
          <Icon size={18} strokeWidth={2.25} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}
