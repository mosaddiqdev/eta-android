import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { ArtImage } from "../../features/village/components/ArtImage";
import { imageUrl } from "../../game/images";
import { EtaNotifications } from "../../native/notifications";
import { alertId } from "../../notifications/compose";
import { type Kind, type Sound, soundFor } from "../../notifications/kinds";
import { updateSettings, useSettings } from "../../settings/settings";
import { Collapse } from "../Collapse";
import { Segmented } from "../SettingsSegmented";
import settings from "../SettingsSheet.module.css";
import { Switch } from "../SettingsSwitch";
import { KIND_ART } from "./kindArt";
import styles from "./Notifications.module.css";
import { SOUND_LABEL, soundOptions } from "./soundChoices";

type Choice = Sound | "default";

/**
 * One kind of notification: its switch, and when it is on, the sound it plays. "Default" follows the sound chosen for
 * everything, so changing that later still reaches the kinds that never picked their own. Picking a sound plays it.
 */
export function KindRow({ kind, hasClash }: { kind: Kind; hasClash: boolean }) {
  const current = useSettings();
  const [open, setOpen] = useState(false);
  const on = !current.notifyOff.includes(kind.id);
  const own = current.notifySounds[kind.id];
  const effective = soundFor(current, kind.id);

  const toggle = (next: boolean) =>
    updateSettings({
      notifyOff: next ? current.notifyOff.filter((id) => id !== kind.id) : [...current.notifyOff, kind.id],
    });

  const choose = (choice: Choice) => {
    const { [kind.id]: _dropped, ...rest } = current.notifySounds;
    updateSettings({ notifySounds: choice === "default" ? rest : { ...rest, [kind.id]: choice } });
    void EtaNotifications.preview({ sound: choice === "default" ? current.notifySound : choice });
  };

  // A real notification through the same path as the others, so the picture, the channel and the sound are all tested.
  const sendTest = () => {
    const art = imageUrl(KIND_ART[kind.id]);
    void EtaNotifications.test({
      item: {
        id: alertId(`test|${kind.id}`),
        at: Date.now(),
        kind: kind.id,
        title: kind.title,
        body: "A test. This is how it looks when it is real.",
        image: art ? `public${art}` : null,
        sound: effective,
      },
    });
  };

  const options: { value: Choice; label: string; hint?: string; disabled?: boolean }[] = [
    { value: "default", label: "Default" },
    ...soundOptions(hasClash),
  ];

  return (
    <div className={styles.kind}>
      <div className={styles.kindTop}>
        <ArtImage imageKey={KIND_ART[kind.id]} kind="building" size={40} />
        <Switch label={kind.title} hint={kind.hint} checked={on} onChange={toggle} />
      </div>
      <Collapse open={on}>
        <button
          type="button"
          className={styles.soundLine}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span>
            Sound <b>{own ? SOUND_LABEL[own] : `Default (${SOUND_LABEL[current.notifySound]})`}</b>
          </span>
          <ChevronDown size={18} aria-hidden="true" data-open={open} />
        </button>
        <Collapse open={open}>
          <div className={styles.soundPanel}>
            <Segmented
              label={`${kind.title} sound`}
              value={own ?? "default"}
              options={options}
              onChange={choose}
            />
            <button type="button" className={settings.quiet} onClick={sendTest}>
              Send a test
            </button>
          </div>
        </Collapse>
      </Collapse>
    </div>
  );
}
