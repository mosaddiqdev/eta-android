import { Check, Info, TriangleAlert } from "lucide-react";
import { EtaNotifications, type NotificationStatus } from "../../native/notifications";
import { updateSettings, useSettings } from "../../settings/settings";
import { Collapse } from "../Collapse";
import settings from "../SettingsSheet.module.css";
import { Switch } from "../SettingsSwitch";
import styles from "./Notifications.module.css";

interface Props {
  status: NotificationStatus | null;
  onStatus: (status: NotificationStatus) => void;
  /** How many alerts are lined up, null while that is still being worked out. */
  coming: number | null;
}

/**
 * The master switch and whether the phone will really deliver. Android asks its permission the first time; after a
 * refusal it won't ask again, so the way forward is its settings and this says so. The two other things that make alerts
 * late or lost (exact alarms, battery limits) show here, only as long as they are a problem.
 */
export function Hero({ status, onStatus, coming }: Props) {
  const { notify } = useSettings();
  const blocked = status?.permission === "denied";
  const on = notify && !blocked;

  const turnOn = async (next: boolean) => {
    if (!next) return updateSettings({ notify: false });
    const after = await EtaNotifications.requestPermission();
    onStatus(after);
    updateSettings({ notify: after.permission === "granted" });
  };

  const hint = blocked
    ? "Blocked in your phone's settings"
    : !on
      ? "Off"
      : coming === null
        ? "On"
        : coming === 0
          ? "On, nothing lined up yet"
          : `On, ${coming} lined up`;

  return (
    <div className={settings.card}>
      <Switch label="Notifications" hint={hint} checked={on} onChange={turnOn} />
      {blocked && (
        <Problem
          title="Turned off for ClashETA"
          detail="Allow notifications in your phone's settings, then come back."
          action="Open phone settings"
          onAction={() => void EtaNotifications.openSettings()}
        />
      )}
      <Collapse open={on && !!status}>
        <div className={styles.health}>
          {status?.exact ? (
            <Good title="On time" detail="Exact alarms are allowed." />
          ) : (
            <Problem
              title="Can come a few minutes late"
              detail="Android holds back alarms unless exact ones are allowed."
              action="Allow exact alarms"
              onAction={() => void EtaNotifications.openExactAlarmSettings()}
            />
          )}
          {status?.unrestricted ? (
            <Good title="Battery is not limiting it" detail="Alerts can arrive while the phone sleeps." />
          ) : (
            <Problem
              tip
              title="If alerts ever don't arrive"
              detail="Some phones stop apps they think are idle. Set ClashETA's battery use to No restrictions."
              action="Open battery settings"
              onAction={() => void EtaNotifications.openBatterySettings()}
            />
          )}
        </div>
      </Collapse>
    </div>
  );
}

function Good({ title, detail }: { title: string; detail: string }) {
  return (
    <div className={styles.healthRow}>
      <Check size={18} className={styles.good} aria-hidden="true" />
      <span>
        <b>{title}</b>
        <small>{detail}</small>
      </span>
    </div>
  );
}

function Problem({
  title,
  detail,
  action,
  onAction,
  tip,
}: {
  tip?: boolean;
  title: string;
  detail: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className={styles.healthRow}>
      {tip ? (
        <Info size={18} className={styles.tip} aria-hidden="true" />
      ) : (
        <TriangleAlert size={18} className={styles.warn} aria-hidden="true" />
      )}
      <span>
        <b>{title}</b>
        <small>{detail}</small>
        <button type="button" className={settings.quiet} onClick={onAction}>
          {action}
        </button>
      </span>
    </div>
  );
}
