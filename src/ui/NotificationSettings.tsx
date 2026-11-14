import { useCallback, useEffect, useState } from "react";
import { artKey, imageUrl } from "../game/images";
import { syncNotifications } from "../native/notificationSync";
import { canNotify, EtaNotifications, type NotificationStatus } from "../native/notifications";
import { updateSettings, useSettings } from "../settings/settings";
import styles from "./SettingsSheet.module.css";
import { Switch } from "./SettingsSwitch";

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return Number.isInteger(h) && Number.isInteger(m) ? h * 60 + m : null;
};

/** The picture a test notification carries, so the person sees how a real one looks. */
const TEST_PICTURE = "building-home/mortar";

/**
 * Settings for the phone's notifications: on or off, which kinds, and quiet hours. Only inside the app, where Android
 * can show them. Turning it on asks Android's permission; when that is refused the way forward is the phone's own
 * settings, so this says so and links there.
 */
export function NotificationSettings() {
  const settings = useSettings();
  const [status, setStatus] = useState<NotificationStatus | null>(null);

  const refresh = useCallback(() => {
    EtaNotifications.status()
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!canNotify()) return;
    refresh();
    // Coming back from the phone's settings: what the person just allowed should show, and take effect, at once.
    const back = () => {
      if (document.visibilityState !== "visible") return;
      refresh();
      syncNotifications();
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [refresh]);

  if (!canNotify()) return null;

  const turnOn = async (on: boolean) => {
    if (!on) return updateSettings({ notify: false });
    const next = await EtaNotifications.requestPermission();
    setStatus(next);
    updateSettings({ notify: next.permission === "granted" });
  };

  const sendTest = () => {
    const picture = imageUrl(artKey(TEST_PICTURE, 15));
    void EtaNotifications.test({
      item: {
        id: 1,
        at: Date.now(),
        channel: "upgrades",
        title: "Notifications are working",
        body: "You will see the building or helper here when something finishes or comes free.",
        image: picture ? `public${picture}` : null,
        silent: false,
      },
    });
  };

  const blocked = status?.permission === "denied";

  return (
    <section className={styles.group}>
      <h3>Notifications</h3>
      <div className={styles.card}>
        <Switch
          label="Tell me when things are done"
          hint="An upgrade finishes, a helper is free, the Clock Tower is ready. It uses your last import, so paste again after using a potion."
          checked={settings.notify && !blocked}
          onChange={turnOn}
        />
        {blocked && (
          <>
            <p className={styles.note}>Notifications for ClashETA are off in your phone's settings.</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.quiet}
                onClick={() => void EtaNotifications.openSettings()}
              >
                Open phone settings
              </button>
            </div>
          </>
        )}
        {settings.notify && !blocked && (
          <>
            <Switch
              label="Helper is free"
              hint="Names the upgrade it would save the most time on."
              checked={settings.notifyHelper}
              onChange={(notifyHelper) => updateSettings({ notifyHelper })}
            />
            <Switch
              label="Clock Tower is ready"
              hint="The Builder Base boost can be used again."
              checked={settings.notifyTower}
              onChange={(notifyTower) => updateSettings({ notifyTower })}
            />
            <Switch
              label="Quiet hours"
              hint="Notifications in this window come without sound."
              checked={settings.quietHours}
              onChange={(quietHours) => updateSettings({ quietHours })}
            />
            {settings.quietHours && (
              <div className={styles.times}>
                <label>
                  From
                  <input
                    type="time"
                    value={hhmm(settings.quietFrom)}
                    onChange={(e) => {
                      const quietFrom = minutes(e.target.value);
                      if (quietFrom !== null) updateSettings({ quietFrom });
                    }}
                  />
                </label>
                <label>
                  Until
                  <input
                    type="time"
                    value={hhmm(settings.quietTo)}
                    onChange={(e) => {
                      const quietTo = minutes(e.target.value);
                      if (quietTo !== null) updateSettings({ quietTo });
                    }}
                  />
                </label>
              </div>
            )}
            {status && !status.exact && (
              <>
                <p className={styles.note}>
                  Android may bring them a few minutes late. Allowing exact alarms makes them arrive on time.
                </p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.quiet}
                    onClick={() => void EtaNotifications.openExactAlarmSettings()}
                  >
                    Allow exact alarms
                  </button>
                </div>
              </>
            )}
            <div className={styles.actions}>
              <button type="button" className={styles.quiet} onClick={sendTest}>
                Send a test
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
