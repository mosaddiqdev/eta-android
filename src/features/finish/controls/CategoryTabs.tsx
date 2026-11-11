import type { CSSProperties } from "react";
import { KINDS, type UpgradeKind } from "../../../engine/items";
import { artUrl } from "../../../game/art";
import { FadeImage } from "../../../ui/FadeImage";
import styles from "./CategoryTabs.module.css";

interface Props {
  value: UpgradeKind;
  timeLabel: Record<UpgradeKind, string | null>;
  onChange: (kind: UpgradeKind) => void;
}

export function CategoryTabs({ value, timeLabel, onChange }: Props) {
  return (
    <fieldset
      className={styles.tabs}
      style={{ "--i": KINDS.findIndex((kind) => kind.id === value) } as CSSProperties}
    >
      <legend className="sr-only">What are you upgrading?</legend>
      {KINDS.map(({ id, label, applies }) => {
        return (
          <label key={id} className={styles.tab} data-kind={id}>
            <input
              className={styles.input}
              type="radio"
              name="kind"
              checked={id === value}
              onChange={() => onChange(id)}
              aria-label={`${label}: ${applies}${timeLabel[id] ? `, ${timeLabel[id]} entered` : ""}`}
            />
            <span className={styles.face}>
              <FadeImage
                src={artUrl(`icons/${id}`)}
                frameClassName={styles.iconFrame}
                imgClassName={styles.icon}
                radius="30%"
              />
              {label}
            </span>
            <span className={styles.time} data-hidden={!timeLabel[id]} aria-hidden="true">
              {timeLabel[id]}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
