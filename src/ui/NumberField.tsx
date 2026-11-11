import styles from "./NumberField.module.css";
import { parseWholeNumber } from "./whole-number";

interface Props {
  label: string;
  unit: string;
  value: number;
  max: number;
  onChange: (value: number) => void;
  enterKeyHint?: "next" | "done";
  /** Called when the typed number has reached two digits. */
  onFilled?: () => void;
}

export function NumberField({ label, unit, value, max, onChange, enterKeyHint, onFilled }: Props) {
  return (
    <label className={styles.field}>
      <input
        className={styles.input}
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint={enterKeyHint}
        placeholder="0"
        aria-label={label}
        value={value || ""}
        onFocus={(event) => event.target.select()}
        onChange={(event) => {
          const next = parseWholeNumber(event.target.value, max);
          onChange(next);
          if (next >= 10) onFilled?.();
        }}
      />
      <span className={styles.unit} aria-hidden="true">
        {unit}
      </span>
    </label>
  );
}
