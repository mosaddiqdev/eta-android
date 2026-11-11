import { CircleCheck, Hourglass, Minus } from "lucide-react";
import type { Verdict } from "../verdict";
import styles from "./VerdictChip.module.css";

const ICONS = { none: Minus, good: CircleCheck, short: Hourglass };

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const Icon = ICONS[verdict.tone];
  return (
    <p className={styles.chip} data-tone={verdict.tone}>
      <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
      {verdict.title}
    </p>
  );
}
