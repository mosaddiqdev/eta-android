import { useId } from "react";
import { confirm } from "./haptics";
import styles from "./SettingsSheet.module.css";

/** A labelled on/off switch with a line of explanation under the label. */
export function Switch({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className={styles.switchRow}>
      <span className={styles.switchText}>
        <span id={id}>{label}</span>
        <small>{hint}</small>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        className={styles.switch}
        onClick={() => {
          onChange(!checked);
          confirm();
        }}
      >
        <span aria-hidden="true" />
      </button>
    </div>
  );
}
