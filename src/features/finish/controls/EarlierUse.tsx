import { ChevronDown, History } from "lucide-react";
import { useState } from "react";
import { Collapse } from "../../../ui/Collapse";
import { tick } from "../../../ui/haptics";
import { parseWholeNumber } from "../../../ui/whole-number";
import styles from "./EarlierUse.module.css";

const PRESETS = [15, 30, 45];

interface Props {
  minutes: number;
  onChange: (minutes: number) => void;
}

export function EarlierUse({ minutes, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls="earlier-use"
        onClick={() => setOpen(!open)}
      >
        <History size={18} aria-hidden="true" />
        <span>{minutes > 0 ? `Used ${minutes} min ago` : "Used earlier?"}</span>
        <ChevronDown size={18} className={styles.chevron} aria-hidden="true" />
      </button>
      <Collapse id="earlier-use" open={open}>
        <div className={styles.panel}>
          <input
            className={styles.input}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            aria-label="Minutes since you used the boost"
            value={minutes || ""}
            onFocus={(event) => event.target.select()}
            onChange={(event) => onChange(parseWholeNumber(event.target.value, 9999))}
          />
          <span className={styles.suffix}>min ago</span>
          <div className={styles.presets}>
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className={styles.preset}
                aria-pressed={minutes === preset}
                onClick={() => {
                  tick();
                  onChange(minutes === preset ? 0 : preset);
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </Collapse>
    </section>
  );
}
