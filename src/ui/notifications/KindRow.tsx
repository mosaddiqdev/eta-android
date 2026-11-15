import { ArtImage } from "../../features/village/components/ArtImage";
import type { Kind } from "../../notifications/kinds";
import { updateSettings, useSettings } from "../../settings/settings";
import { Switch } from "../SettingsSwitch";
import { KIND_ART } from "./kindArt";
import styles from "./Notifications.module.css";

/** One kind of notification, with its picture and a switch. What it plays is the sound chosen for all of them. */
export function KindRow({ kind }: { kind: Kind }) {
  const { notifyOff } = useSettings();
  const on = !notifyOff.includes(kind.id);
  return (
    <div className={styles.kindTop}>
      <ArtImage imageKey={KIND_ART[kind.id]} kind="building" size={40} />
      <Switch
        label={kind.title}
        hint={kind.hint}
        checked={on}
        onChange={(next) =>
          updateSettings({
            notifyOff: next ? notifyOff.filter((id) => id !== kind.id) : [...notifyOff, kind.id],
          })
        }
      />
    </div>
  );
}
