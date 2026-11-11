import { RotateCcw } from "lucide-react";
import { type KeyboardEvent, useRef } from "react";
import { type Duration, formatAgo } from "../../../engine/time";
import { NumberField } from "../../../ui/NumberField";
import styles from "./TimeCard.module.css";

const FIELDS: { key: keyof Duration; label: string; unit: string; max: number }[] = [
  { key: "days", label: "Days", unit: "d", max: 999 },
  { key: "hours", label: "Hours", unit: "h", max: 99 },
  { key: "minutes", label: "Minutes", unit: "m", max: 99 },
  { key: "seconds", label: "Seconds", unit: "s", max: 99 },
];

interface Props {
  value: Duration;
  /** When the time was typed (ms), and the clock now. */
  enteredAt: number;
  now: number;
  onChange: (value: Duration) => void;
  onClear: () => void;
}

export function TimeCard({ value, enteredAt, now, onChange, onClear }: Props) {
  const empty = FIELDS.every(({ key }) => value[key] === 0);
  const fields = useRef<HTMLDivElement>(null);

  const inputs = () => Array.from(fields.current?.querySelectorAll("input") ?? []);

  // Enter moves along the row, and on the last field it closes the keyboard so the result is in view.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    const all = inputs();
    const next = all[all.indexOf(event.target) + 1];
    if (next) next.focus();
    else event.target.blur();
  }

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <div>
          <h2 className={styles.title}>Time left</h2>
          <p className={styles.entered}>
            {empty
              ? "Type what the game shows"
              : `Entered ${formatAgo(Math.max(0, (now - enteredAt) / 1000))}`}
          </p>
        </div>
        <button type="button" className={styles.clear} onClick={onClear} disabled={empty}>
          <RotateCcw size={16} aria-hidden="true" />
          Clear
        </button>
      </header>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: only relays Enter from the inputs inside it */}
      <div className={styles.fields} ref={fields} onKeyDown={onKeyDown}>
        {FIELDS.map(({ key, label, unit, max }, index) => (
          <NumberField
            key={key}
            label={label}
            unit={unit}
            max={max}
            enterKeyHint={index === FIELDS.length - 1 ? "done" : "next"}
            // Two digits fill an hour, minute or second, so the cursor moves on by itself (days can be any length).
            onFilled={max < 100 && index < FIELDS.length - 1 ? () => inputs()[index + 1]?.focus() : undefined}
            value={value[key]}
            onChange={(next) => onChange({ ...value, [key]: next })}
          />
        ))}
      </div>
    </section>
  );
}
