import { formatDuration } from "../../engine/time";
import { formatTime } from "../../features/finish/format";
import type { Alert } from "../../notifications/compose";
import { useSettings } from "../../settings/settings";
import { FadeImage } from "../FadeImage";
import { Group } from "../SettingsGroup";
import settings from "../SettingsSheet.module.css";
import styles from "./Notifications.module.css";

const SHOWN = 3;

/** The next few alerts, as they will look, so a change in the settings shows what it does. */
export function UpNext({ alerts }: { alerts: Alert[] | null }) {
  const { clock } = useSettings();
  // Read once per render of the list; the sheet is short-lived and the numbers only need to be about right.
  const now = Date.now();
  if (alerts === null) return null;

  return (
    <Group title="Up next">
      {alerts.length === 0 ? (
        <p className={settings.note}>
          Nothing is lined up. Paste an export from the game on My village and the alerts for it appear here.
        </p>
      ) : (
        <ul className={styles.next}>
          {alerts.slice(0, SHOWN).map((alert) => (
            <li key={alert.id}>
              {alert.image ? (
                <FadeImage src={alert.image.replace(/^public/, "")} alt="" size={44} />
              ) : (
                <span className={styles.blank} />
              )}
              <span>
                <b>{alert.title}</b>
                <small>
                  in {formatDuration(Math.round((alert.at - now) / 1000))},{" "}
                  {formatTime(new Date(alert.at), clock)}
                  {alert.sound === "silent" ? ", no sound" : ""}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Group>
  );
}
