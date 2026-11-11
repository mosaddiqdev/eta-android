import { artUrl } from "../../../game/art";
import type { Verdict } from "../verdict";
import { describeSuggestion } from "../verdict";
import styles from "./Suggestions.module.css";

// The potion and snack art says which item; the amount is all the sighted reader needs. Spoken text stays in full.
export function Suggestions({ verdict }: { verdict: Verdict }) {
  const { lead, options } = verdict;
  if (!lead) return null;

  return (
    <div className={styles.box}>
      <span className={styles.lead}>{lead}</span>
      <ul className={styles.options}>
        {options.map((option, index) => (
          <li key={option.item.id} className={styles.option} data-change={option.change}>
            {index > 0 && <span className={styles.or}>or</span>}
            <span className={styles.pill}>
              <img src={artUrl(`items/${option.item.art}`)} alt="" draggable={false} />
              <span aria-hidden="true">
                {option.change === "more" ? "+" : "\u2212"}
                {option.amount}
              </span>
              <span className="sr-only">{describeSuggestion(option)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
