import { ChevronLeft } from "lucide-react";
import { KIND_GROUPS } from "../../notifications/kinds";
import { useSettings } from "../../settings/settings";
import { Collapse } from "../Collapse";
import { Group } from "../SettingsGroup";
import settings from "../SettingsSheet.module.css";
import { useSheetDialog } from "../useSheetDialog";
import { DefaultSound } from "./DefaultSound";
import { Hero } from "./Hero";
import { KindRow } from "./KindRow";
import styles from "./Notifications.module.css";
import { QuietHours } from "./QuietHours";
import { UpNext } from "./UpNext";
import { useNotificationStatus } from "./useNotificationStatus";
import { usePlannedAlerts } from "./usePlannedAlerts";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Back to Settings, where this sheet was opened from. */
  onBack: () => void;
}

/**
 * Everything about notifications on one sheet, reached from Settings. Top to bottom: whether they work, what is lined
 * up next, which kinds are on and each one's sound, the default sound, then quiet hours. The body only exists while
 * the sheet is open, like Settings, so what it reads is fresh each time.
 */
export function NotificationsSheet({ open, onClose, onBack }: Props) {
  const sheet = useSheetDialog(open);
  return (
    // A click on the backdrop lands on the dialog element itself, not on anything inside it.
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape already closes a modal dialog.
    <dialog
      {...sheet.props}
      className={settings.sheet}
      aria-labelledby="notifications-title"
      onClose={onClose}
      onClick={(event) => event.target === event.currentTarget && sheet.close()}
    >
      {sheet.mounted && <Body onBack={onBack} />}
    </dialog>
  );
}

function Body({ onBack }: { onBack: () => void }) {
  const { notify } = useSettings();
  const { status, setStatus } = useNotificationStatus();
  const alerts = usePlannedAlerts();
  const hasClash = status?.clash ?? false;
  const active = notify && status?.permission === "granted";

  return (
    <div className={settings.body}>
      <header className={`${settings.head} ${styles.head}`}>
        <button type="button" className={settings.close} onClick={onBack} aria-label="Back to settings">
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <h2 id="notifications-title">Notifications</h2>
      </header>

      <Hero status={status} onStatus={setStatus} coming={alerts?.length ?? null} />

      <Collapse open={active} className={styles.rest}>
        <div className={styles.restBody}>
          <UpNext alerts={alerts} />
          {KIND_GROUPS.map((group) => (
            <Group key={group.title} title={group.title}>
              {group.kinds.map((kind) => (
                <KindRow key={kind.id} kind={kind} hasClash={hasClash} />
              ))}
            </Group>
          ))}
          <DefaultSound hasClash={hasClash} />
          <QuietHours />
          <p className={settings.note}>
            Times come from your last import. Paste a fresh export after you use a potion or start an upgrade,
            and the alerts catch up.
          </p>
        </div>
      </Collapse>
    </div>
  );
}
