import { formatDuration } from "../engine/time";
import { artKey, imageUrl } from "../game/images";
import type { Plan } from "../village/plan";
import { helperOptions } from "../village/potion";
import type { Account, Lane } from "../village/types";
import { type Cue, type KindId, kindOf, type Sound, type SoundChoices, soundFor } from "./kinds";

/** What the phone is asked to show: the words, the picture and the moment. Matches EtaNotifier.java. */
export interface Alert {
  /** Stable for the same thing at the same time, so sending the list again replaces the alarm and never doubles it. */
  id: number;
  /** Unix milliseconds. */
  at: number;
  kind: KindId;
  title: string;
  body: string;
  /** Path in the app's assets (public/game/...), or null when the game data has no picture for it. */
  image: string | null;
  /** What it plays. Silent inside quiet hours, whatever the kind chose. */
  sound: Sound;
  /** Which of the game's sounds "clash" plays for this one. */
  cue: Cue;
}

export interface QuietHours {
  from: number;
  to: number;
}

export interface Village {
  account: Account;
  plan: Plan;
}

export interface Wanted extends SoundChoices {
  /** Kinds switched off. */
  off: readonly KindId[];
  quiet: QuietHours | null;
}

// Android allows 500 alarms per app and nobody needs the far end of a month-long queue today.
const MAX_ALERTS = 200;

const FREE: Record<Lane, string> = {
  builder: "A builder is free.",
  lab: "The Laboratory is free.",
  pet: "The Pet House is free.",
  bbBuilder: "The Master Builder is free.",
  bbLab: "The Star Laboratory is free.",
};

/** Whether `at` (unix ms) falls inside the window, which may run past midnight. Both ends are minutes after midnight. */
export function isQuiet(at: number, { from, to }: QuietHours) {
  if (from === to) return false;
  const date = new Date(at);
  const minute = date.getHours() * 60 + date.getMinutes();
  return from < to ? minute >= from && minute < to : minute >= from || minute < to;
}

/** A number the phone can use as an id, the same for the same text. FNV-1a, kept positive and inside 31 bits. */
export function alertId(text: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
  return (hash >>> 0) & 0x7fffffff;
}

const assetPath = (key: string | null) => {
  const url = imageUrl(key);
  return url ? `public${url}` : null;
};

/** Where the notification sits among the player's villages. Left out when there is only one. */
const where = (tag: string, many: boolean) => (many ? ` ${tag}` : "");

/** Heroes have their own sound, research and pets share one, and everything else is the finished-building sound. */
function cueOf(upgrade: Plan["upgrades"][number]): Cue {
  if (upgrade.kind === "hero") return "hero";
  return upgrade.kind === "pet" || upgrade.lane === "lab" || upgrade.lane === "bbLab" ? "lab" : "building";
}

function upgradeTitle(u: Plan["upgrades"][number]) {
  if (u.gearUp) return `${u.name} is geared up`;
  if (u.firstBuild) return `${u.name} is built`;
  if (u.crafting) return `${u.name} is done`;
  return `${u.name} is now level ${u.toLevel}`;
}

function finished(plan: Plan, key: string, many: boolean, tag: string) {
  const done = plan.upgrades.find((u) => u.key === key);
  if (!done) return null;
  // What is left in that lane after this one, so the body says when the next free moment after this comes.
  const next = plan.upgrades.find((u) => u.lane === done.lane && u.finishAt > done.finishAt && u.key !== key);
  const after = next
    ? ` Next done: ${next.name} in ${formatDuration(next.finishAt - done.finishAt)}.`
    : " Nothing else is running there.";
  return {
    cue: cueOf(done),
    title: upgradeTitle(done),
    body: `${FREE[done.lane]}${after}${where(tag, many)}`.trim(),
    image: assetPath(done.nextImage ?? done.image),
  };
}

function helperFree(account: Account, lane: Lane, at: number, plan: Plan, many: boolean, tag: string) {
  if (lane !== "builder" && lane !== "lab") return null;
  const { helper, options } = helperOptions(account, lane, at);
  if (!helper) return null;
  // An upgrade that is over by then can't use it.
  const live = options.filter((o) => (plan.upgrades.find((u) => u.key === o.key)?.finishAt ?? 0) > at);
  const best = live[0];
  // Nothing to put it on, or nothing it would speed up: no reason to wake anyone.
  if (!best || best.savedRecurrent <= 0) return null;
  const once = formatDuration(best.saved);
  const kept = formatDuration(best.savedRecurrent);
  const saves =
    best.saved > 0 && best.saved < best.savedRecurrent ? `${once}, or ${kept} if you keep it on` : kept;
  return {
    cue: "building" as Cue,
    title: `${helper.name} is free`,
    body: `Best spot: ${best.name}. Saves ${saves}.${where(tag, many)}`,
    image: assetPath(helper.image),
  };
}

function towerReady(account: Account, many: boolean, tag: string) {
  const tower = account.clockTower;
  if (!tower) return null;
  return {
    cue: "building" as Cue,
    title: `${tower.name} is ready`,
    body: `${tower.bonus + 1}x speed for ${formatDuration(tower.seconds)} on the Master Builder and the Star Laboratory.${where(tag, many)}`,
    image: assetPath(artKey(tower.image, tower.level)),
  };
}

/**
 * Every notification worth sending, soonest first. The plan already knows when things finish, when the helpers are
 * free and when the Clock Tower is ready; this turns each of those into a few plain words and a picture. It works from
 * what the last import said, so a potion drunk since then is not known and a time can come out a little off.
 */
export function composeAlerts(villages: Village[], wanted: Wanted, now: number): Alert[] {
  const many = villages.length > 1;
  const alerts: Alert[] = [];
  for (const { account, plan } of villages) {
    for (const event of plan.events) {
      const at = event.at * 1000;
      const kind = kindOf(event);
      if (at <= now || !kind || wanted.off.includes(kind)) continue;
      let words: { cue: Cue; title: string; body: string; image: string | null } | null = null;
      if (event.kind === "finish" && event.key) words = finished(plan, event.key, many, account.tag);
      else if (event.kind === "helperReady")
        words = helperFree(account, event.lane, event.at, plan, many, account.tag);
      else if (event.kind === "towerReady") words = towerReady(account, many, account.tag);
      if (!words) continue;
      alerts.push({
        id: alertId(`${account.tag}|${event.kind}|${event.key ?? event.lane}|${event.at}`),
        at,
        kind,
        ...words,
        sound: wanted.quiet && isQuiet(at, wanted.quiet) ? "silent" : soundFor(wanted, kind),
      });
    }
  }
  return alerts.sort((a, b) => a.at - b.at).slice(0, MAX_ALERTS);
}
