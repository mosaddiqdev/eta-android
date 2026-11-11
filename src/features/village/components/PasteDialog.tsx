import { TriangleAlert, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useSheetDialog } from "../../../ui/useSheetDialog";
import { COPY_STEPS } from "../../../village/constants";
import styles from "./PasteDialog.module.css";

interface Props {
  open: boolean;
  error: string | null;
  /** Why the box opened on its own (a blocked clipboard, say). Without one, the box says where to copy from, unless an error already does. */
  reason: string | null;
  onSubmit: (text: string) => Promise<boolean>;
  onClose: () => void;
}

/** Bottom sheet on a phone, a centered card on wide screens: the same family as the villages menu. */
export function PasteDialog({ open, error, reason, onSubmit, onClose }: Props) {
  const area = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const hintId = useId();
  const errorId = useId();

  const sheet = useSheetDialog(open, () => area.current?.focus());

  async function submit(value = text) {
    if (busy) return;
    setBusy(true);
    const ok = await onSubmit(value);
    setBusy(false);
    if (ok) {
      setText("");
      onClose();
    }
  }

  return (
    // A click on the backdrop lands on the dialog element itself, not on anything inside it. What was typed is
    // kept, so closing by accident costs nothing.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape already closes a modal dialog.
    <dialog
      {...sheet.props}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        method="dialog"
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className={styles.head}>
          <h2 id={titleId}>Paste village data</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* An error already says where to copy from, so the plain hint steps aside for it. */}
        {(reason || !error) && (
          <p className={styles.hint} id={hintId}>
            {reason ?? `Copy it in the game (${COPY_STEPS}), then paste it below.`}
          </p>
        )}

        {error && (
          <p className={styles.error} id={errorId} role="alert">
            <TriangleAlert size={18} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        <textarea
          ref={area}
          className={styles.area}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onPaste={(event) => {
            // A whole export pasted in is the finished job, so don't make the player hunt for Import.
            const pasted = event.clipboardData.getData("text/plain").trim();
            if (pasted.startsWith("{") && pasted.endsWith("}")) void submit(pasted);
          }}
          placeholder="Paste your village data here"
          rows={6}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label="Village data"
          aria-describedby={
            [reason || !error ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined
          }
          aria-invalid={error ? true : undefined}
        />

        <button type="submit" className={styles.submit} disabled={busy || !text.trim()} aria-busy={busy}>
          {busy ? "Importing…" : "Import village"}
        </button>
      </form>
    </dialog>
  );
}
