import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

/** Opens the phone's share sheet. False where there is none, so the caller copies the text instead. */
export async function shareOnPhone(text: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    await Share.share({ text });
    return true;
  }
  if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
    await navigator.share({ text });
    return true;
  }
  return false;
}
