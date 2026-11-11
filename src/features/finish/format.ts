import { type Clock, getSettings } from "../../settings/settings";

// "auto" leaves the choice to the device's own habit; the others force it. h23 keeps midnight "00:05", never "24:05".
const timeFormats: Record<Clock, Intl.DateTimeFormat> = {
  auto: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }),
  "12": new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hourCycle: "h12" }),
  "24": new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }),
};

/** A clock time as the player chose to read it; `clock` is for showing what a choice would look like. */
export const formatTime = (date: Date | number, clock: Clock = getSettings().clock) =>
  timeFormats[clock].format(date);
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

// Compare calendar days, not 24h blocks, so a daylight-saving change can't shift "tomorrow".
function dayNumber(date: Date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

export function finishParts(finishAt: number, now: number) {
  const finish = new Date(finishAt);
  const daysAway = dayNumber(finish) - dayNumber(new Date(now));
  const day = daysAway === 0 ? "Today" : daysAway === 1 ? "Tomorrow" : dayFormat.format(finish);
  return { day, time: formatTime(finish) };
}
