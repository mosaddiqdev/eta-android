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

/**
 * One kind of notification: its switch, and when it is on, the sound it plays. A kind only keeps a choice of its own when
 * it differs from the sound chosen for all alerts, so changing that one later still reaches the kinds that match it.
 * Picking a sound plays it.
 */
export function KindRow({ kind, hasClash }: { kind: Kind; hasClash: boolean }) {
  const current = useSettings();
  const [open, setOpen] = useState(false);
  const on = !current.notifyOff.includes(kind.id);
  const effective = soundFor(current, kind.id);

  const toggle = (next: boolean) =>
    updateSettings({
      notifyOff: next ? current.notifyOff.filter((id) => id !== kind.id) : [...current.notifyOff, kind.id],
    });

  const choose = (sound: Sound) => {
    const { [kind.id]: _dropped, ...rest } = current.notifySounds;
    updateSettings({ notifySounds: sound === current.notifySound ? rest : { ...rest, [kind.id]: sound } });
    void EtaNotifications.preview({ sound });
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
            Sound <b>{SOUND_LABEL[effective]}</b>
          </span>
          <ChevronDown size={18} aria-hidden="true" data-open={open} />
        </button>
        <Collapse open={open}>
          <div className={styles.soundPanel}>
            <Segmented
              label={`${kind.title} sound`}
              value={effective}
              options={soundOptions(hasClash)}
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
