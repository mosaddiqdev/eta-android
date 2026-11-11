import { ClipboardPaste, TriangleAlert, X } from "lucide-react";
import styles from "./ImportProblem.module.css";

interface Props {
  message: string;
  /** Opens the paste box: typing the data in is the way out of any import problem. */
  onPasteText: () => void;
  /** Only where something else is on screen to go back to. The empty screen has nothing to dismiss to. */
  onDismiss?: () => void;
}

/** What an import problem looks like, on the empty screen and over an open village alike. */
export function ImportProblem({ message, onPasteText, onDismiss }: Props) {
  return (
    <div className={styles.host}>
      <div className={styles.problem} role="alert" data-dismissible={onDismiss ? "" : undefined}>
        <TriangleAlert size={18} aria-hidden="true" />
        <p className={styles.text}>{message}</p>
        <button type="button" className={styles.action} onClick={onPasteText}>
          <ClipboardPaste size={18} aria-hidden="true" />
          Paste text instead
        </button>
        {onDismiss && (
          <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
