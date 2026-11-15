import { useCallback, useEffect, useState } from "react";
import { syncNotifications } from "../../native/notificationSync";
import { EtaNotifications, type NotificationStatus } from "../../native/notifications";

/**
 * What Android says about permission, timing and battery. Read when the sheet opens and again when the person comes
 * back from the phone's settings, where they may just have changed one: the new state shows, and the alarms are set
 * again with it.
 */
export function useNotificationStatus() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const refresh = useCallback(() => {
    EtaNotifications.status()
      .then(setStatus)
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    const back = () => {
      if (document.visibilityState !== "visible") return;
      refresh();
      syncNotifications();
    };
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [refresh]);

  return { status, setStatus };
}
