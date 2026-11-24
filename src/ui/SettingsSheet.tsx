import { ChevronRight, Monitor, Moon, Sun, Trash2, X } from "lucide-react";
import { useId, useState } from "react";
import { formatTime } from "../features/finish/format";
import { noVillages, readVillages, villageLabel, writeVillages } from "../features/village/villages";
import { canImportOnOpen } from "../native/clipboardImport";
import { canNotify } from "../native/notifications";
import { KIND_IDS } from "../notifications/kinds";
import { type Clock, type StartOn, type Theme, updateSettings, useSettings } from "../settings/settings";
import { canWidget } from "../widgets/plugin";
import { gameDataSummary } from "./about/gameDataAge";
import { Collapse } from "./Collapse";
import { canVibrate, confirm, tick } from "./haptics";
import { Group } from "./SettingsGroup";
import { type Option, Segmented } from "./SettingsSegmented";
import styles from "./SettingsSheet.module.css";
import { Switch } from "./SettingsSwitch";
import { useSheetDialog } from "./useSheetDialog";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Opens the credits in the About sheet. */
  onCredits: () => void;
  /** Opens the Notifications sheet. Only offered inside the Android app. */
  onNotifications: () => void;
}

/**
 * Settings: a bottom sheet on a phone and a centered card from tablet width, like the paste box. Everything is saved the
 * moment it changes, so there is no Save button and nothing to lose by closing it. The body only exists while it is open,
 * so what it shows about saved villages and dates is read fresh each time.
 *
 * The groups run in the order you reach for them: look and feel (theme, clock, touch), the village (page it opens on,
 * finished rows), notifications and import (Android only), then what the app keeps (saved data), and About last.
 * Vibration only shows where the device can buzz.
 */
export function SettingsSheet({ open, onClose, onCredits, onNotifications }: Props) {
  const sheet = useSheetDialog(open);

  return (
    // A click on the backdrop lands on the dialog element itself, not on anything inside it.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape already closes a modal dialog.
    <dialog
      {...sheet.props}
      className={styles.sheet}
      aria-labelledby="settings-title"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && sheet.close()}
    >
      {sheet.mounted && (
        <Body onClose={sheet.close} onCredits={onCredits} onNotifications={onNotifications} />
      )}
    </dialog>
  );
}

function Body({
  onClose,
  onCredits,
  onNotifications,
}: {
  onClose: () => void;
  onCredits: () => void;
  onNotifications: () => void;
}) {
  const settings = useSettings();
  const [now] = useState(() => new Date());

  const themes: Option<Theme>[] = [
    { value: "auto", label: "Auto", icon: <Monitor size={18} aria-hidden="true" /> },
    { value: "dark", label: "Dark", icon: <Moon size={18} aria-hidden="true" /> },
    { value: "light", label: "Light", icon: <Sun size={18} aria-hidden="true" /> },
  ];
  const clocks: Option<Clock>[] = [
    { value: "auto", label: "Auto", hint: "Your device" },
    { value: "12", label: "12-hour", hint: formatTime(now, "12") },
    { value: "24", label: "24-hour", hint: formatTime(now, "24") },
  ];
  const starts: Option<StartOn>[] = [
    { value: "auto", label: "Auto" },
    { value: "village", label: "My village" },
    { value: "finish", label: "Finish time" },
  ];

  return (
    <div className={styles.body}>
      <header className={styles.head}>
        <h2 id="settings-title">Settings</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close settings">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <Group title="Look and feel">
        <Segmented
          label="Theme"
          value={settings.theme}
          options={themes}
          onChange={(theme) => updateSettings({ theme })}
        />
        <Segmented
          label="Clock"
          value={settings.clock}
          options={clocks}
          onChange={(clock) => updateSettings({ clock })}
        />
        {canVibrate() && (
          <Switch
            label="Vibrate on tap"
            hint="A tiny buzz when you change a count or flip a switch."
            checked={settings.haptics}
            onChange={(haptics) => updateSettings({ haptics })}
          />
        )}
      </Group>

      <Group title="Village">
        <Segmented
          label="Page that opens first"
          value={settings.startOn}
          options={starts}
          onChange={(startOn) => updateSettings({ startOn })}
        />
        <p className={styles.note}>{START_NOTE[settings.startOn]}</p>
        <Switch
          label="Hide finished upgrades"
          hint="Leaves out rows that are probably done."
          checked={settings.hideFinished}
          onChange={(hideFinished) => updateSettings({ hideFinished })}
        />
      </Group>

      {(canNotify() || canImportOnOpen()) && (
        <Group title="Notifications and import">
          {canNotify() && <Notifications onOpen={onNotifications} />}
          {canImportOnOpen() && (
            <Switch
              label="Import when opened"
              hint="Imports a new village you copied when you open the app."
              checked={settings.autoImport}
              onChange={(autoImport) => updateSettings({ autoImport })}
            />
          )}
        </Group>
      )}

      {canWidget() && (
        <Group title="Widgets">
          <MainVillage />
        </Group>
      )}

      <Group title="Saved data">
        <SavedData />
      </Group>

      <Group title="About">
        <Credits onOpen={onCredits} />
      </Group>
    </div>
  );
}

const START_NOTE: Record<StartOn, string> = {
  auto: "Opens My village once you have saved one, and Finish time before that.",
  finish: "Always opens Finish time, even with a saved village.",
  village: "Always opens My village. Until you import one, that is the import screen.",
};

/**
 * Which village the one-village widgets show. Auto is the one opened last for Workers and every village for Next finish; a
 * village picked here is the one both show. The Villages widget always shows them all, so it ignores this.
 */
function MainVillage() {
  const settings = useSettings();
  const [villages] = useState(() => readVillages().villages);
  const id = useId();
  // A village that was forgotten since falls back to Auto on screen too, not to a blank select.
  const value = villages.some((v) => v.tag === settings.mainVillage) ? settings.mainVillage : "";
  return (
    <div className={styles.dataRow}>
      <label className={styles.switchText} htmlFor={id}>
        <span>Main village</span>
        <small>Workers and Next finish show this one. Villages shows all.</small>
      </label>
      <select
        id={id}
        className={styles.select}
        value={value}
        disabled={villages.length === 0}
        onChange={(event) => {
          tick();
          updateSettings({ mainVillage: event.target.value });
        }}
      >
        <option value="">Auto</option>
        {villages.map((v) => (
          <option key={v.tag} value={v.tag}>
            {villageLabel(v)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Saved villages live only on this phone. Forgetting them all is one confirmed tap, and the page reloads empty. */
function SavedData() {
  const [count] = useState(() => readVillages().villages.length);
  const [sure, setSure] = useState(false);

  const forget = () => {
    writeVillages(noVillages);
    window.location.reload();
  };

  return (
    <>
      <div className={styles.dataRow}>
        <span className={styles.switchText}>
          <span>
            {count === 0 ? "No saved villages" : count === 1 ? "1 saved village" : `${count} saved villages`}
          </span>
          <small>Kept on this phone. Nothing is sent anywhere.</small>
        </span>
        {count > 0 && !sure && (
          <button type="button" className={styles.quiet} onClick={() => setSure(true)}>
            <Trash2 size={16} aria-hidden="true" />
            Forget
          </button>
        )}
      </div>
      <Collapse open={sure}>
        <div className={styles.confirm} role="alert">
          <p>
            Forget {count === 1 ? "this village" : `all ${count} villages`}? You can paste an export again any
            time.
          </p>
          <div>
            <button type="button" className={styles.quiet} onClick={() => setSure(false)}>
              Keep
            </button>
            <button
              type="button"
              className={styles.danger}
              onClick={() => {
                confirm();
                forget();
              }}
            >
              Forget
            </button>
          </div>
        </div>
      </Collapse>
    </>
  );
}

/**
 * The way into Credits. The details (versions, dates, licences) live in one place, About › Credits, so Settings only
 * says how fresh the game data is and where to read more, in the same words as the table it opens.
 */
function Credits({ onOpen }: { onOpen: () => void }) {
  const [now] = useState(() => new Date());
  return (
    <button type="button" className={styles.navRow} onClick={onOpen}>
      <span className={styles.switchText}>
        <span>Credits</span>
        <small>{gameDataSummary(now)}</small>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  );
}

/** The way into the Notifications sheet. Its words say where things stand, so the row is useful before it is opened. */
function Notifications({ onOpen }: { onOpen: () => void }) {
  const { notify, notifyOff } = useSettings();
  const on = KIND_IDS.length - notifyOff.length;
  return (
    <button type="button" className={styles.navRow} onClick={onOpen}>
      <span className={styles.switchText}>
        <span>Notifications</span>
        <small>{notify ? `On, ${on} of ${KIND_IDS.length} kinds` : "Off"}</small>
      </span>
      <ChevronRight size={18} aria-hidden="true" />
    </button>
  );
}
