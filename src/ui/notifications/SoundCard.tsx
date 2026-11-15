import { Play } from "lucide-react";
import { imageUrl } from "../../game/images";
import { EtaNotifications } from "../../native/notifications";
import { alertId } from "../../notifications/compose";
import type { Cue } from "../../notifications/kinds";
import { updateSettings, useSettings } from "../../settings/settings";
import { Collapse } from "../Collapse";
import { Group } from "../SettingsGroup";
import { Segmented } from "../SettingsSegmented";
import settings from "../SettingsSheet.module.css";
import styles from "./Notifications.module.css";
import { soundOptions } from "./soundChoices";

const CUES: { cue: Cue; label: string }[] = [
  { cue: "building", label: "Building" },
  { cue: "hero", label: "Hero" },
  { cue: "lab", label: "Research" },
];

/**
 * What every notification plays. Clash uses the game's own sound for what finished (a building, a hero, research or a
 * pet), so one choice covers all of them; the three can be heard below it. A test sends a real notification, so the
 * picture, the words and the sound are all checked together.
 */
export function SoundCard({ hasClash }: { hasClash: boolean }) {
  const { notifySound } = useSettings();

  const sendTest = () => {
    const art = imageUrl("building-home/mortar");
    void EtaNotifications.test({
      item: {
        id: alertId("test"),
        at: Date.now(),
        kind: "builder",
        title: "Notifications are working",
        body: "You will see the building or helper here when something finishes or comes free.",
        image: art ? `public${art}` : null,
        sound: notifySound,
        cue: "building",
      },
    });
  };

  return (
    <Group title="Sound">
      <Segmented
        label="Notification sound"
        value={notifySound}
        options={soundOptions(hasClash)}
        onChange={(sound) => {
          updateSettings({ notifySound: sound });
          void EtaNotifications.preview({ sound, cue: "building" });
        }}
      />
      <Collapse open={notifySound === "clash" && hasClash}>
        <div className={styles.hear}>
          {CUES.map(({ cue, label }) => (
            <button
              key={cue}
              type="button"
              className={settings.quiet}
              onClick={() => void EtaNotifications.preview({ sound: "clash", cue })}
            >
              <Play size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
      </Collapse>
      <p className={settings.note}>
        {notifySound === "clash"
          ? "The game's sound for what finished. Helpers and the Clock Tower use the building one."
          : notifySound === "system"
            ? "Your phone's notification sound, from Android's settings."
            : "Alerts still show, without a sound."}
      </p>
      <div className={styles.actions}>
        <button type="button" className={settings.quiet} onClick={sendTest}>
          Send a test
        </button>
      </div>
    </Group>
  );
}
