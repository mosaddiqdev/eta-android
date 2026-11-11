import { ChevronRight, Menu, X } from "lucide-react";
import { type CSSProperties, useEffect, useRef, useState } from "react";
import { FOOT_ITEMS, isCurrent, MAIN_ITEMS, type MenuItem } from "../layouts/menu";
import { AboutSheet, type AboutTab } from "./AboutSheet";
import { SettingsSheet } from "./SettingsSheet";
import styles from "./SideMenu.module.css";

// Keep in step with `--out` and `--hand` in SideMenu.module.css; the timeouts only guard a missed animationend.
const OUT_MS = 180;
const HAND_MS = 260;

/** How the menu leaves: `out` plays its exit, `instant` is for a page link, `handoff` is for a sheet opening over it. */
type Leave = "out" | "instant" | "handoff";

export default function SideMenu({ currentPath }: { currentPath: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<number>(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [about, setAbout] = useState<{ open: boolean; tab: AboutTab }>({ open: false, tab: "story" });
  const openAbout = (tab: AboutTab = "story") => setAbout({ open: true, tab });

  // Open is pure CSS (it plays whenever the dialog is shown). Close plays its own animation first, then
  // really closes the dialog, so Escape, the backdrop and the X leave the same way. A page link skips it: the
  // choice is made and the page is leaving anyway.
  // A handoff is for Settings and About. The sheet opens straight away, on top, and the menu's card fades out under
  // it while the menu's dim fades out as the sheet's own dim fades in. The page therefore stays dimmed the whole
  // time, instead of flashing back to full brightness between the menu going and the sheet arriving.
  function close(how: Leave = "out") {
    const el = dialog.current;
    if (!el?.open || el.dataset.state) return;
    const finish = () => {
      window.clearTimeout(timer.current);
      panel.current?.removeEventListener("animationend", onEnd);
      if (el.open) el.close();
      delete el.dataset.state;
    };
    const onEnd = (event: AnimationEvent) => {
      if (event.target === panel.current) finish();
    };
    if (how === "instant" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return finish();
    if (how === "handoff") {
      el.dataset.state = "handoff";
      timer.current = window.setTimeout(finish, HAND_MS + 40);
      return;
    }
    el.dataset.state = "closing";
    panel.current?.addEventListener("animationend", onEnd);
    timer.current = window.setTimeout(finish, OUT_MS + 120);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <Menu size={22} aria-hidden="true" />
      </button>

      {/* Backdrop click is a pointer shortcut; keyboard users close with Escape. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: Escape closes a modal dialog natively */}
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-label="Menu"
        onClick={(event) => event.target === event.currentTarget && close()}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div ref={panel} className={styles.panel}>
          <header className={styles.top}>
            <span className={`${styles.title} display`}>Menu</span>
            <button type="button" className={styles.close} aria-label="Close menu" onClick={() => close()}>
              <X size={22} aria-hidden="true" />
            </button>
          </header>

          <nav aria-label="Tools">
            <ul className={styles.list}>
              {MAIN_ITEMS.map((item, i) => (
                <Row
                  key={item.id}
                  item={item}
                  index={i}
                  current={isCurrent(item, currentPath)}
                  onPick={() => close("instant")}
                />
              ))}
            </ul>
          </nav>

          <div className={styles.rest}>
            <nav aria-label="More">
              <ul className={styles.list}>
                {FOOT_ITEMS.map((item, i) => (
                  <Row
                    key={item.id}
                    item={item}
                    index={MAIN_ITEMS.length + i}
                    current={isCurrent(item, currentPath)}
                    onPick={() => close("instant")}
                    onAction={() => {
                      // The sheet opens first, so it is already on top when the menu starts to leave.
                      if (item.action === "about") openAbout();
                      else setSettingsOpen(true);
                      close("handoff");
                    }}
                  />
                ))}
              </ul>
            </nav>
            <p className={styles.legal}>
              Unofficial fan tool, not endorsed by Supercell.{" "}
              <button
                type="button"
                className={styles.legalLink}
                onClick={() => {
                  openAbout("credits");
                  close("handoff");
                }}
              >
                Credits
              </button>
            </p>
          </div>
        </div>
      </dialog>
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onCredits={() => {
          setSettingsOpen(false);
          openAbout("credits");
        }}
      />
      <AboutSheet
        open={about.open}
        tab={about.tab}
        onClose={() => setAbout((a) => ({ ...a, open: false }))}
      />
    </>
  );
}

function Row({
  item,
  index,
  current,
  onPick,
  onAction,
}: {
  item: MenuItem;
  index: number;
  current: boolean;
  onPick: () => void;
  onAction?: () => void;
}) {
  const Icon = item.icon;
  const body = (
    <>
      <span className={styles.tile}>
        <Icon size={20} aria-hidden="true" />
      </span>
      <span className={styles.text}>
        <span className={styles.label}>{item.label}</span>
        {item.hint && <span className={styles.hint}>{item.hint}</span>}
      </span>
      {item.href || item.action ? (
        <ChevronRight size={18} className={styles.go} aria-hidden="true" />
      ) : (
        <span className={styles.soon}>Soon</span>
      )}
    </>
  );

  return (
    <li className={styles.item} style={{ "--i": index } as CSSProperties}>
      {item.href ? (
        // Picking a row closes the menu at once, with no exit animation: the choice is already made.
        <a
          className={styles.row}
          href={item.href}
          aria-current={current ? "page" : undefined}
          onClick={onPick}
        >
          {body}
        </a>
      ) : item.action ? (
        <button type="button" className={styles.row} onClick={onAction}>
          {body}
        </button>
      ) : (
        <div className={styles.row} data-soon="true" aria-disabled="true">
          {body}
        </div>
      )}
    </li>
  );
}
