import { formatTime } from "../../features/finish/format";
import { updateSettings, useSettings } from "../../settings/settings";
import { Collapse } from "../Collapse";
import { Group } from "../SettingsGroup";
import settings from "../SettingsSheet.module.css";
import { Switch } from "../SettingsSwitch";

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

function minutesOf(time: string) {
  const [h, m] = time.split(":").map(Number);
  return Number.isInteger(h) && Number.isInteger(m) ? h * 60 + m : null;
}

const spoken = (minutes: number, clock: "auto" | "12" | "24") =>
  formatTime(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60), clock);

/** A window with no sound. The alerts still arrive, they just don't make a noise; the window may run past midnight. */
export function QuietHours() {
  const { quietHours, quietFrom, quietTo, clock } = useSettings();

  const time = (label: string, value: number, key: "quietFrom" | "quietTo") => (
    <label>
      {label}
      <input
        type="time"
        value={hhmm(value)}
        onChange={(event) => {
          const minutes = minutesOf(event.target.value);
          if (minutes !== null) updateSettings({ [key]: minutes });
        }}
      />
    </label>
  );

  return (
    <Group title="Quiet hours">
      <Switch
        label="Silence alerts"
        hint={
          quietHours ? `${spoken(quietFrom, clock)} to ${spoken(quietTo, clock)}, shown without sound` : "Off"
        }
        checked={quietHours}
        onChange={(next) => updateSettings({ quietHours: next })}
      />
      <Collapse open={quietHours}>
        <div className={settings.times}>
          {time("From", quietFrom, "quietFrom")}
          {time("Until", quietTo, "quietTo")}
        </div>
      </Collapse>
    </Group>
  );
}
