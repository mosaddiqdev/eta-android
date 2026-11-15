import { type ReactNode, useId } from "react";
import { tick } from "./haptics";
import styles from "./SettingsSheet.module.css";

export interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: ReactNode;
  /** Shown but can't be picked, with its hint saying why. */
  disabled?: boolean;
}

/** Radio buttons drawn as one pill with a lit side. Real radios, so arrow keys and screen readers just work. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  const name = useId();
  return (
    <fieldset
      className={styles.segmented}
      style={
        {
          "--n": options.length,
          "--i": Math.max(
            0,
            options.findIndex((o) => o.value === value),
          ),
        } as React.CSSProperties
      }
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => {
              onChange(option.value);
              tick();
            }}
          />
          <span>
            {option.icon}
            <b>{option.label}</b>
            {option.hint && <small>{option.hint}</small>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
