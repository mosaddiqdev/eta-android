import { Capacitor, registerPlugin } from "@capacitor/core";

interface EtaWidgets {
  /** Keeps `data` for the widget and draws it again. The native side finds the widget by `widget`. */
  update(options: { widget: string; data: object }): Promise<void>;
}

/** Widgets are Android's own (scripts/android/widgets). The website has none. */
export const canWidget = () => Capacitor.isNativePlatform();

export const EtaWidgets = registerPlugin<EtaWidgets>("EtaWidgets");
