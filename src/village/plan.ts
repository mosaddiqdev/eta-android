import { windowsFor } from "./rates";
import { emptyScenario, type Scenario } from "./scenario";
import type { Account, Lane, ParseWarning, Upgrade, Window } from "./types";
import { type Projection, project } from "./windows";

export interface PlannedUpgrade extends Upgrade {
  /** Unix seconds. */
  finishAt: number;
  /** Seconds from now, never negative. */
  finishIn: number;
  /** The export is old enough that this has probably already finished. */
  likelyDone: boolean;
  projection: Projection;
  /** Every boost that covers this upgrade, so the row can show what is speeding it up. */
  windows: Window[];
}

export interface LaneSummary {
  lane: Lane;
  capacity: number | null;
  busy: number;
  goblinBusy: number;
  idle: number | null;
  nextFreeAt: number | null;
  allFreeAt: number | null;
}

export type EventKind = "finish" | "boostEnds" | "helperReady" | "helperEnds" | "towerReady";

export interface PlanEvent {
  at: number;
  kind: EventKind;
  lane: Lane;
  /** Upgrade key for finish and helperEnds events. */
  key?: string;
  /** `ITEMS` id for boostEnds events of a potion or snack, so the schedule can show its picture. */
  item?: string;
  label: string;
}

export type InsightCode = "idle-builders" | "boost-without-work" | "old-export" | "helper-ready";

export interface Insight {
  code: InsightCode;
  lane?: Lane;
  detail?: number;
}

export interface Plan {
  exportedAt: number;
  now: number;
  /** Seconds since the export was written. */
  age: number;
  upgrades: PlannedUpgrade[];
  lanes: LaneSummary[];
  events: PlanEvent[];
  insights: Insight[];
  warnings: ParseWarning[];
}

const LANES: Lane[] = ["builder", "lab", "pet", "bbBuilder", "bbLab"];
const OLD_EXPORT = 60 * 60;

export function planUpgrade(upgrade: Upgrade, account: Account, scenario: Scenario): PlannedUpgrade {
  const windows = windowsFor(upgrade, account, scenario);
  const projection = project(upgrade.remaining, windows);
  const finishAt = account.exportedAt + projection.finish;
  return {
    ...upgrade,
    finishAt,
    finishIn: Math.max(0, finishAt - scenario.now),
    likelyDone: finishAt <= scenario.now,
    projection,
    windows,
  };
}

/**
 * How many workers a lane has right now and how many of them are busy. A Goblin Builder or Goblin Researcher is an extra
 * worker only while he is working, so with one on the job a lane of 6 shows 7 of 7, and without one it shows 6 of 6.
 * Null for a lane with no known worker count.
 */
export function laneLoad(summary: LaneSummary): { busy: number; total: number } | null {
  if (summary.capacity === null) return null;
  return { busy: summary.busy + summary.goblinBusy, total: summary.capacity + summary.goblinBusy };
}

function summarize(lane: Lane, upgrades: PlannedUpgrade[], account: Account): LaneSummary {
  // An upgrade that has already finished no longer occupies a worker, so it is not counted as busy.
  const inLane = upgrades.filter((u) => u.lane === lane && !u.likelyDone);
  const regular = inLane.filter((u) => !u.goblin);
  const capacity = account.capacity[lane];
  const finishes = regular.map((u) => u.finishAt);
  return {
    lane,
    capacity,
    busy: regular.length,
    goblinBusy: inLane.length - regular.length,
    idle: capacity === null ? null : Math.max(0, capacity - regular.length),
    nextFreeAt: finishes.length ? Math.min(...finishes) : null,
    allFreeAt: finishes.length ? Math.max(...finishes) : null,
  };
}

function eventsFor(upgrades: PlannedUpgrade[], account: Account, now: number): PlanEvent[] {
  const events: PlanEvent[] = upgrades.map((u) => ({
    at: u.finishAt,
    kind: "finish",
    lane: u.lane,
    key: u.key,
    label: u.name,
  }));
  const { boosts, helpers, exportedAt } = account;
  const ends: [Lane, string, number, string?][] = [
    ["builder", "Builder Potion", boosts.builder, "builderPotion"],
    ["builder", "Builder Bite", boosts.builderSnack, "builderBite"],
    ["lab", "Research Potion", boosts.lab, "researchPotion"],
    ["lab", "Study Soup", boosts.labSnack, "studySoup"],
    ["pet", "Pet Potion", boosts.pet, "petPotion"],
    ["bbBuilder", "Clock Tower", boosts.clockTower],
  ];
  for (const [lane, label, seconds, item] of ends) {
    if (seconds > 0) events.push({ at: exportedAt + seconds, kind: "boostEnds", lane, label, item });
  }
  if (account.clockTower) {
    // Ready once both the running boost and the cooldown are over; nothing to announce when it is ready already.
    const readyIn = Math.max(boosts.clockTower, boosts.clockTowerCooldown);
    if (readyIn > 0)
      events.push({
        at: exportedAt + readyIn,
        kind: "towerReady",
        lane: "bbBuilder",
        label: account.clockTower.name,
      });
  }
  for (const kind of ["builder", "lab"] as const) {
    const helper = helpers[kind];
    if (!helper) continue;
    if (helpers.cooldown > 0)
      events.push({ at: exportedAt + helpers.cooldown, kind: "helperReady", lane: kind, label: helper.name });
    for (const u of upgrades) {
      const active = u.lane === kind ? (u.helper?.activeRemaining ?? 0) : 0;
      if (active > 0)
        events.push({
          at: exportedAt + active,
          kind: "helperEnds",
          lane: kind,
          key: u.key,
          label: helper.name,
        });
    }
  }
  return events.filter((e) => e.at >= now - 60).sort((a, b) => a.at - b.at);
}

function insightsFor(account: Account, lanes: LaneSummary[], age: number): Insight[] {
  const insights: Insight[] = [];
  if (age > OLD_EXPORT) insights.push({ code: "old-export", detail: age });
  for (const summary of lanes) {
    if (summary.idle) insights.push({ code: "idle-builders", lane: summary.lane, detail: summary.idle });
  }
  const { boosts } = account;
  const running: [Lane, number][] = [
    ["builder", boosts.builder + boosts.builderSnack],
    ["lab", boosts.lab + boosts.labSnack],
    ["pet", boosts.pet],
  ];
  for (const [lane, seconds] of running) {
    const summary = lanes.find((l) => l.lane === lane);
    if (seconds > 0 && summary && summary.busy + summary.goblinBusy === 0)
      insights.push({ code: "boost-without-work", lane });
  }
  for (const kind of ["builder", "lab"] as const) {
    if (account.helpers[kind] && account.helpers.cooldown === 0)
      insights.push({ code: "helper-ready", lane: kind });
  }
  return insights;
}

export function buildPlan(
  account: Account,
  warnings: ParseWarning[],
  scenario = emptyScenario(Math.floor(Date.now() / 1000)),
): Plan {
  const upgrades = account.upgrades
    .map((u) => planUpgrade(u, account, scenario))
    .sort((a, b) => a.finishAt - b.finishAt);
  const lanes = LANES.map((lane) => summarize(lane, upgrades, account));
  const age = Math.max(0, scenario.now - account.exportedAt);
  return {
    exportedAt: account.exportedAt,
    now: scenario.now,
    age,
    upgrades,
    lanes,
    events: eventsFor(upgrades, account, scenario.now),
    insights: insightsFor(account, lanes, age),
    warnings,
  };
}
