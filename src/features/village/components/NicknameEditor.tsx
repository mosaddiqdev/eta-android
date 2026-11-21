import { ArrowLeft } from "lucide-react";
import { useId, useState } from "react";
import { confirm, tick } from "../../../ui/haptics";
import { cleanNickname, NICKNAME_MAX, type VillageSummary } from "../villages";
import styles from "./NicknameEditor.module.css";
import { VillageCrest } from "./VillageCrest";

const SUGGESTIONS = ["Main", "Alt", "Farm", "War", "Clan games"];

interface Props {
  village: VillageSummary;
  /** Every saved village, so a name that is already taken is not offered again. */
  villages: VillageSummary[];
  onBack: () => void;
  onSave: (tag: string, text: string) => void;
}

/** Names a village. Saves on Enter or Save, and an empty name takes the nickname off again. */
export function NicknameEditor({ village, villages, onBack, onSave }: Props) {
  const [text, setText] = useState(village.nickname ?? "");
  const inputId = useId();
  const taken = new Set(
    villages.filter((v) => v.tag !== village.tag && v.nickname).map((v) => v.nickname?.toLowerCase()),
  );
  const ideas = SUGGESTIONS.filter((s) => !taken.has(s.toLowerCase()));
  const clean = cleanNickname(text);
  const clash = clean !== undefined && taken.has(clean.toLowerCase());
  const changed = (clean ?? "") !== (village.nickname ?? "");

  const save = () => {
    if (clash) return;
    confirm();
    onSave(village.tag, text);
    onBack();
  };

  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className={styles.head}>
        <button type="button" className={styles.back} onClick={onBack} aria-label="Back to your villages">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h2 id="village-menu-title">Name this village</h2>
      </div>

      <div className={styles.who}>
        <VillageCrest townHall={village.townHall} size="lg" />
        <span className={styles.tag}>{village.tag}</span>
      </div>

      <label className={styles.field} htmlFor={inputId}>
        <span className={styles.caption}>Nickname</span>
        <input
          id={inputId}
          className={styles.input}
          value={text}
          maxLength={NICKNAME_MAX}
          placeholder="Main, Alt, Farm…"
          enterKeyHint="done"
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          // The sheet opens straight into typing, so a nickname is one tap and a word.
          // biome-ignore lint/a11y/noAutofocus: the editor opens because the person asked to type here.
          autoFocus
          aria-invalid={clash || undefined}
          aria-describedby={`${inputId}-help`}
          onChange={(event) => setText(event.target.value)}
        />
        <span className={styles.help} id={`${inputId}-help`} data-bad={clash || undefined}>
          {clash
            ? "Another village already has this name."
            : `Shown instead of the tag. ${text.length}/${NICKNAME_MAX}`}
        </span>
      </label>

      {ideas.length > 0 && (
        <fieldset className={styles.ideas} aria-label="Suggestions">
          {ideas.map((idea) => (
            <button
              key={idea}
              type="button"
              className={styles.idea}
              onClick={() => {
                tick();
                setText(idea);
              }}
            >
              {idea}
            </button>
          ))}
        </fieldset>
      )}

      <div className={styles.actions}>
        {village.nickname && (
          <button
            type="button"
            className={styles.remove}
            onClick={() => {
              onSave(village.tag, "");
              onBack();
            }}
          >
            Remove name
          </button>
        )}
        <button type="submit" className={styles.save} disabled={!changed || clash}>
          Save
        </button>
      </div>
    </form>
  );
}
