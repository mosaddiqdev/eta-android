import { useEffect, useState } from "react";
import { plannedAlerts } from "../../native/notificationSync";
import type { Alert } from "../../notifications/compose";
import { useSettings } from "../../settings/settings";

/** What would be sent right now, read again whenever a notification setting changes. Null until the first read. */
export function usePlannedAlerts() {
  const settings = useSettings();
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const shape = JSON.stringify([
    settings.notifyOff,
    settings.notifySound,
    settings.quietHours,
    settings.quietFrom,
    settings.quietTo,
  ]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `shape` stands for the settings plannedAlerts reads
  useEffect(() => {
    let current = true;
    plannedAlerts()
      .then((next) => current && setAlerts(next))
      .catch(() => current && setAlerts([]));
    return () => {
      current = false;
    };
  }, [shape]);
  return alerts;
}
