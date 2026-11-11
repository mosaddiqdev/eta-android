import { X } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import styles from "./AboutSheet.module.css";
import { Credits } from "./about/Credits";
import { How } from "./about/How";
import { Story } from "./about/Story";
import { type AboutTab, TABS } from "./about/tabs";
import { tick } from "./haptics";
import { useSheetDialog } from "./useSheetDialog";
import { useSwipeTabs } from "./useSwipeTabs";
import { useTabDirection } from "./useTabDirection";

export type { AboutTab };

const TAB_IDS = TABS.map((t) => t.id);

interface Props {
  open: boolean;
  tab: AboutTab;
  onClose: () => void;
}

/**
 * Story, how it works and credits in one place: a tall sheet on a phone with tabs along the top, and a two-column
 * reader from tablet width, with the tabs and the sections of the open tab down the left. Like Settings, the body
 * only exists while the dialog is open.
 */
export function AboutSheet({ open, tab, onClose }: Props) {
  const sheet = useSheetDialog(open);

  return (
    // A click on the backdrop lands on the dialog element itself, not on anything inside it.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape already closes a modal dialog.
    <dialog
      {...sheet.props}
      className={styles.sheet}
      aria-labelledby="about-title"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && sheet.close()}
    >
      {sheet.mounted && <Body first={tab} onClose={sheet.close} />}
    </dialog>
  );
}

function Body({ first, onClose }: { first: AboutTab; onClose: () => void }) {
  const [tab, setTab] = useState<AboutTab>(first);
  const scroller = useRef<HTMLDivElement>(null);
  const index = TAB_IDS.indexOf(tab);
  const direction = useTabDirection(index);
  // On a phone the tabs are a pill under the title; a sideways swipe on the text turns the page too.
  const go = (next: AboutTab) => {
    if (next === tab) return;
    tick();
    setTab(next);
  };
  useSwipeTabs(scroller, TAB_IDS, tab, go, true);

  // Another tab starts at its top, not wherever the last one was left.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `tab` is the trigger, it is not read inside
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [tab]);

  // Scrolls the text pane itself. scrollIntoView also scrolls every ancestor that can still move, and for the last
  // section (which cannot reach the top of a pane that is already at its end) that was the sheet: the sidebar and the
  // text slid up together and left an empty band at the bottom.
  function jump(id: string) {
    const pane = scroller.current;
    const target = pane?.querySelector(`#about-${id}`);
    if (!pane || !target) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gap = Number.parseFloat(getComputedStyle(pane).scrollPaddingTop) || 0;
    const top = target.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - gap;
    pane.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
  }

  return (
    <div className={styles.frame}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>ClashETA</p>
          <h2 id="about-title">About</h2>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close about">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <nav className={styles.rail} aria-label="About sections">
        <ul className={styles.tabs} style={{ "--i": index } as CSSProperties}>
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-current={t.id === tab ? "true" : undefined}
                className={styles.tab}
                onClick={() => go(t.id)}
              >
                {t.label}
              </button>
              {t.id === tab && (
                <ul className={styles.toc}>
                  {t.sections.map((s) => (
                    <li key={s.id}>
                      <button type="button" onClick={() => jump(s.id)}>
                        {s.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles.scroller} ref={scroller}>
        <div
          className={styles.panel}
          // A new tab starts from its own animation: it slides in from the side the tab pill moved towards.
          key={tab}
          data-direction={direction}
        >
          {tab === "story" && <Story />}
          {tab === "how" && <How />}
          {tab === "credits" && <Credits />}
        </div>
      </div>
    </div>
  );
}
