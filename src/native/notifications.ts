import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Alert } from "../notifications/compose";
import type { Cue, Sound } from "../notifications/kinds";

export interface NotificationStatus {
  /** "prompt": Android will still ask. "denied": only the phone's settings can allow it now. */
  permission: "granted" | "prompt" | "denied";
  /** Exact alarms are allowed. Without them notifications can come a few minutes late. */
  exact: boolean;
  /** Battery use isn't restricted, which is what keeps alarms alive on phones that stop idle apps. */
  unrestricted: boolean;
  /** The game's upgrade sounds are in this build. */
  clash: boolean;
}

interface EtaNotifications {
  status(): Promise<NotificationStatus>;
  requestPermission(): Promise<NotificationStatus>;
  schedule(options: { items: Alert[] }): Promise<void>;
  test(options: { item: Alert }): Promise<void>;
  preview(options: { sound: Sound; cue: Cue }): Promise<void>;
  openSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
  openExactAlarmSettings(): Promise<void>;
}

// The notifications are Android's own (EtaNotificationsPlugin.java). The website has none.
export const canNotify = () => Capacitor.isNativePlatform();

export const EtaNotifications = registerPlugin<EtaNotifications>("EtaNotifications");
