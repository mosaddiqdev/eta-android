import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { type RefObject, useEffect, useState } from "react";
import { preloadWhenIdle, townHallImage } from "../../../game/images";
import { confirm, tick } from "../../../ui/haptics";
import { useSheetDialog } from "../../../ui/useSheetDialog";
import { ago } from "../format";
import { type VillageSummary, villageLabel } from "../villages";
import { NicknameEditor } from "./NicknameEditor";
import { VillageCrest } from "./VillageCrest";
import styles from "./VillageMenu.module.css";

interface Props {
  open: boolean;
  villages: VillageSummary[];
  activeTag: string;
  now: number;
  /** The control the menu hangs from on wide screens. */
  anchor: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSwitch: (tag: string) => void;
  onAdd: () => void;
  onForget: () => void;
  onRename: (tag: string, text: string) => void;
}

/** Bottom sheet on a phone, popover under the Update button on wide screens. Same content, same dialog. */
export function VillageMenu({
  open,
  villages,
  activeTag,
  now,
  anchor,
  onClose,
  onSwitch,
  onAdd,
  onForget,
  onRename,
}: Props) {
  const [naming, setNaming] = useState<string | null>(null);
  const editing = villages.find((v) => v.tag === naming);
  // The pictures sit in a closed dialog, so without this they would only start loading on the first tap.
  useEffect(() => preloadWhenIdle(villages.map((v) => townHallImage(v.townHall))), [villages]);

  // Where the popover hangs is measured as it opens, from the control it belongs to.
  const sheet = useSheetDialog(open, (el) => {
    const box = anchor.current?.getBoundingClientRect();
    if (!box) return;
    el.style.setProperty("--menu-top", `${box.bottom + 8}px`);
    el.style.setProperty("--menu-right", `${document.documentElement.clientWidth - box.right}px`);
  });

  // Close first, then act, all inside the tap: reading the clipboard only works while the tap is still fresh.
  const choose = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    // A click on the backdrop lands on the dialog element itself, not on anything inside it.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape already closes a modal dialog.
    <dialog
      {...sheet.props}
      className={styles.menu}
      aria-labelledby="village-menu-title"
      onClose={() => {
        setNaming(null);
        onClose();
      }}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className={styles.body}>
        {editing ? (
          <NicknameEditor
            village={editing}
            villages={villages}
            onBack={() => setNaming(null)}
            onSave={onRename}
          />
        ) : (
          <>
            <div className={styles.head}>
              <h2 id="village-menu-title">Your villages</h2>
              <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <ul className={styles.list}>
              {villages.map((v) => {
                const current = v.tag === activeTag;
                return (
                  <li key={v.tag} className={styles.row}>
                    <button
                      type="button"
                      className={styles.village}
                      aria-current={current || undefined}
                      onClick={choose(() => {
                        if (!current) tick();
                        onSwitch(v.tag);
                      })}
                    >
                      <VillageCrest townHall={v.townHall} size="md" />
                      <span className={styles.name}>
                        <span className={styles.tag} data-named={v.nickname ? "" : undefined}>
                          {villageLabel(v)}
                        </span>
                        <span className={styles.age}>
                          {v.nickname && <span className={styles.mono}>{v.tag} · </span>}
                          {ago(Math.max(0, now - v.exportedAt))}
                        </span>
                      </span>
                      {current && <Check size={20} aria-hidden="true" />}
                    </button>
                    <button
                      type="button"
                      className={styles.rename}
                      aria-label={`${v.nickname ? "Rename" : "Name"} ${villageLabel(v)}`}
                      onClick={() => {
                        tick();
                        setNaming(v.tag);
                      }}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className={styles.actions}>
              <button type="button" className={styles.action} onClick={choose(onAdd)}>
                <span className={styles.icon}>
                  <Plus size={20} aria-hidden="true" />
                </span>
                <span className={styles.label}>
                  Import another village
                  <small>Copy it in the game first, then tap here</small>
                </span>
              </button>
              <button
                type="button"
                className={styles.action}
                data-danger
                onClick={choose(() => {
                  confirm();
                  onForget();
                })}
              >
                <span className={styles.icon}>
                  <Trash2 size={18} aria-hidden="true" />
                </span>
                <span className={styles.label}>Forget this village</span>
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
