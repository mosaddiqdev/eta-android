import type { Sound } from "../../notifications/kinds";
import type { Option } from "../SettingsSegmented";

export const SOUND_LABEL: Record<Sound, string> = { system: "Phone", clash: "Clash", silent: "None" };

/** The sounds as choices. The game's sound is shown but locked in a build that doesn't carry it. */
export function soundOptions(hasClash: boolean): Option<Sound>[] {
  return (["system", "clash", "silent"] as const).map((value) => ({
    value,
    label: SOUND_LABEL[value],
    hint: value === "clash" && !hasClash ? "Soon" : undefined,
    disabled: value === "clash" && !hasClash,
  }));
}
