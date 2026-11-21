import { ChevronDown, ClipboardPaste, TriangleAlert } from "lucide-react";
import { useRef, useState } from "react";
import { Disclosure } from "../../../ui/Disclosure";
import type { ParseWarning } from "../../../village/types";
import { ago } from "../format";
import { type VillageSummary, villageLabel } from "../villages";
import styles from "./AccountBar.module.css";
import { VillageCrest } from "./VillageCrest";
import { VillageMenu } from "./VillageMenu";

interface Props {
  tag: string;
  nickname?: string;
  townHall: number | null;
  age: number;
  now: number;
  warnings: ParseWarning[];
  villages: VillageSummary[];
  busy: boolean;
  onUpdate: () => void;
  onSwitch: (tag: string) => void;
  onAdd: () => void;
  onForget: () => void;
  onRename: (tag: string, text: string) => void;
}

export function AccountBar({
  tag,
  nickname,
  townHall,
  age,
  now,
  warnings,
  villages,
  busy,
  ...actions
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const split = useRef<HTMLDivElement>(null);
  const old = age > 3600;
  return (
    <header className={styles.bar}>
      <div className={styles.who}>
        <VillageCrest townHall={townHall} size="lg" />
        <div className={styles.text}>
          <span className={styles.line}>
            <span className={styles.tag} data-named={nickname ? "" : undefined}>
              {villageLabel({ tag, nickname })}
            </span>
            {nickname && <span className={styles.sub}>{tag}</span>}
          </span>
          <span className={styles.age} data-old={old}>
            {old && <TriangleAlert size={14} aria-hidden="true" />}
            {ago(age)}
          </span>
        </div>
      </div>

      {/* Update is the everyday action, so it is one tap. The arrow holds everything rarer. It reads the clipboard, so
          the paste icon says where the data comes from (a refresh icon would promise the app can fetch it itself),
          and the wide layout has room to say so in words. */}
      <div className={styles.split} ref={split}>
        <button
          type="button"
          className={styles.update}
          title="Update from your copied village data"
          onClick={actions.onUpdate}
          disabled={busy}
        >
          <ClipboardPaste size={18} aria-hidden="true" className={styles.icon} />
          <span className={styles.long}>Update from clipboard</span>
          <span className={styles.short}>Update</span>
        </button>
        <button
          type="button"
          className={styles.more}
          aria-label="Villages and import options"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <ChevronDown size={20} aria-hidden="true" />
        </button>
      </div>

      <VillageMenu
        open={menuOpen}
        villages={villages}
        activeTag={tag}
        now={now}
        anchor={split}
        onClose={() => setMenuOpen(false)}
        onSwitch={actions.onSwitch}
        onAdd={actions.onAdd}
        onForget={actions.onForget}
        onRename={actions.onRename}
      />

      {warnings.length > 0 && (
        <Disclosure
          className={styles.notes}
          trigger={`${warnings.length} ${warnings.length === 1 ? "note" : "notes"} about this import`}
        >
          <ul>
            {warnings.map((w) => (
              <li key={w.message}>{w.message}</li>
            ))}
          </ul>
        </Disclosure>
      )}
    </header>
  );
}
