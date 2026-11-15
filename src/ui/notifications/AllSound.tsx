import { EtaNotifications } from "../../native/notifications";
import { updateSettings, useSettings } from "../../settings/settings";
import { Group } from "../SettingsGroup";
import { Segmented } from "../SettingsSegmented";
import settings from "../SettingsSheet.module.css";
import { soundOptions } from "./soundChoices";

/** One choice for every kind at once. A kind can still pick differently below, and this puts them all back in line. */
export function AllSound({ hasClash }: { hasClash: boolean }) {
  const { notifySound } = useSettings();
  return (
    <Group title="Sound for all alerts">
      <Segmented
        label="Sound for all alerts"
        value={notifySound}
        options={soundOptions(hasClash)}
        onChange={(sound) => {
          updateSettings({ notifySound: sound, notifySounds: {} });
          void EtaNotifications.preview({ sound, cue: "building" });
        }}
      />
      <p className={settings.note}>
        Phone is the notification sound from Android's settings. This sets every kind below; each can then
        pick its own.
      </p>
    </Group>
  );
}
