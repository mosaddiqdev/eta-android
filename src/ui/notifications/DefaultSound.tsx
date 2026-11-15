import { EtaNotifications } from "../../native/notifications";
import { updateSettings, useSettings } from "../../settings/settings";
import { Group } from "../SettingsGroup";
import { Segmented } from "../SettingsSegmented";
import settings from "../SettingsSheet.module.css";
import { soundOptions } from "./soundChoices";

/** The sound for every kind that hasn't picked its own. */
export function DefaultSound({ hasClash }: { hasClash: boolean }) {
  const { notifySound } = useSettings();
  return (
    <Group title="Default sound">
      <Segmented
        label="Default sound"
        value={notifySound}
        options={soundOptions(hasClash)}
        onChange={(sound) => {
          updateSettings({ notifySound: sound });
          void EtaNotifications.preview({ sound });
        }}
      />
      <p className={settings.note}>
        Phone is your notification sound from Android's settings. Each kind above can pick its own.
      </p>
    </Group>
  );
}
