import { ClipboardPaste, Lock } from "lucide-react";
import { useArtReady } from "../../../game/useArtReady";
import { boneGroup } from "../../../ui/Bone";
import { ImportGuide } from "../../../ui/ImportGuide";
import styles from "./ImportEmpty.module.css";
import { HERO_ART, ImportHero } from "./ImportHero";
import { ImportProblem } from "./ImportProblem";

interface Props {
  busy: boolean;
  error: string | null;
  onClipboard: () => void;
  onText: () => void;
  onSample: () => void;
}

/** The import screen once its pictures are there. Until then the same screen stands in as its own skeleton. */
export function ImportEmpty(props: Props) {
  // The screen is built around the three buildings, so it appears once they are there and its arrival plays whole.
  const ready = useArtReady(HERO_ART);
  return <ImportScreen key={ready ? "ready" : "wait"} skeleton={!ready} {...props} />;
}

interface ScreenProps extends Props {
  /** Draw the screen as placeholders (styles/skeleton.css): the same boxes, nothing to read or press. */
  skeleton?: boolean;
}

export function ImportScreen({ busy, error, onClipboard, onText, onSample, skeleton = false }: ScreenProps) {
  return (
    <section
      className={skeleton ? `${boneGroup} ${styles.empty}` : styles.empty}
      data-skeleton={skeleton || undefined}
      aria-hidden={skeleton || undefined}
      inert={skeleton}
    >
      <div className={styles.intro}>
        <ImportHero />
        <h1>Import your village</h1>
        <p className={styles.lead}>
          Every upgrade timer in one place, so you know exactly when to come back to the game.
        </p>

        {error && <ImportProblem message={error} onPasteText={onText} />}

        <button type="button" className={styles.primary} onClick={onClipboard} disabled={busy}>
          <ClipboardPaste size={20} aria-hidden="true" />
          Paste from clipboard
        </button>
        <p className={styles.keys}>Or press Ctrl+V (⌘V on a Mac) anywhere on this page.</p>
      </div>

      <ImportGuide className={styles.guide} />

      <div className={styles.foot}>
        <button type="button" className={styles.sample} onClick={onSample} disabled={busy}>
          Or look around with a sample village
        </button>
        <p className={styles.privacy}>
          <Lock size={14} aria-hidden="true" />
          Your export is read on this device and never uploaded.
        </p>
      </div>
    </section>
  );
}
