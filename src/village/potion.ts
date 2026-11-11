import { BONUS, HOUR } from "./constants";
import { type PlannedUpgrade, planUpgrade } from "./plan";
import { windowsFor } from "./rates";
import type { HelperAssign, PotionUse, Scenario } from "./scenario";
import { emptyScenario, helperKindOf } from "./scenario";
import type { Account, Helper, Lane, Window } from "./types";
import { project } from "./windows";

export interface UpgradeImpact {
  key: string;
  name: string;
  /** Seconds the finish moves earlier. Smaller than `work` when a helper would have sped up the tail anyway. */
  saved: number;
  /** Extra base-speed work the boost does before the upgrade completes: bonus x seconds it was useful. */
  work: number;
}

export interface PotionImpact {
  perUpgrade: UpgradeImpact[];
  /** Sum of seconds the finishes move earlier across the lane's upgrades. */
  saved: number;
  /** Sum of extra work done. This is the figure the wiki quotes ("saves 9 hours per builder"). */
  work: number;
  /** What the same potion would save if every worker were busy for the whole hour. */
  potential: number;
  wasted: number;
  /** work / potential, 0 to 1. */
  efficiency: number;
}

const BONUS_OF: Record<string, number> = {
  "potion:builder": BONUS.builderPotion,
  "snack:builder": BONUS.builderSnack,
  "potion:lab": BONUS.researchPotion,
  "snack:lab": BONUS.studySoup,
  "potion:pet": BONUS.petPotion,
  "snack:pet": BONUS.studySoup,
};

/** Seconds of [0, limit] that windows of one source cover. Windows of one source never overlap. */
function coverage(windows: Window[], source: Window["source"], limit: number) {
  return windows
    .filter((w) => w.source === source)
    .reduce((sum, w) => sum + Math.max(0, Math.min(w.end, limit) - Math.max(w.start, 0)), 0);
}

const lanesOf = (use: PotionUse): Lane[] =>
  use.source === "snack" && use.lane !== "builder" ? ["lab", "pet"] : [use.lane];

/** How much finish time a potion or snack would save, and how much of it would be wasted. */
export function potionImpact(
  account: Account,
  use: PotionUse,
  now: number,
  base: Scenario = emptyScenario(now),
): PotionImpact {
  const lanes = lanesOf(use);
  const withUse: Scenario = { ...base, potions: [...base.potions, use] };
  const perUpgrade: UpgradeImpact[] = [];
  const bonus = BONUS_OF[`${use.source}:${use.lane}`];
  for (const upgrade of account.upgrades.filter((u) => lanes.includes(u.lane))) {
    const before = planUpgrade(upgrade, account, base).projection.finish;
    const after = planUpgrade(upgrade, account, withUse).projection.finish;
    const added =
      coverage(windowsFor(upgrade, account, withUse), use.source, after) -
      coverage(windowsFor(upgrade, account, base), use.source, after);
    perUpgrade.push({ key: upgrade.key, name: upgrade.name, saved: before - after, work: bonus * added });
  }

  const saved = perUpgrade.reduce((sum, item) => sum + item.saved, 0);
  const work = perUpgrade.reduce((sum, item) => sum + item.work, 0);
  // Every worker could use the full boost: that is the most the potion can ever give.
  const workers = lanes.reduce(
    (sum, lane) => sum + (account.capacity[lane] ?? account.upgrades.filter((u) => u.lane === lane).length),
    0,
  );
  const potential = bonus * use.count * HOUR * workers;
  return {
    perUpgrade,
    saved,
    work,
    potential,
    wasted: Math.max(0, potential - work),
    efficiency: potential > 0 ? Math.min(1, work / potential) : 0,
  };
}

/** Checks the moments when something finishes: waiting until a worker is busy again wastes less. */
export function potionOutlook(
  account: Account,
  source: PotionUse["source"],
  lane: PotionUse["lane"],
  count: number,
  now: number,
  horizon = 48 * HOUR,
) {
  const candidates = [
    now,
    ...account.upgrades
      .filter((u) => u.lane === lane)
      .map((u) => planUpgrade(u, account, emptyScenario(now)).finishAt),
  ];
  return [...new Set(candidates)]
    .filter((at) => at >= now && at <= now + horizon)
    .sort((a, b) => a - b)
    .map((at) => ({ at, impact: potionImpact(account, { source, lane, count, at }, now) }));
}

export interface HelperOption {
  key: string;
  name: string;
  /** Seconds saved by one assignment. */
  saved: number;
  /** Seconds saved if it is kept assigned until the upgrade completes. */
  savedRecurrent: number;
}

/** Ranks the upgrades a free helper could join. Assumes nothing else changes. */
export function helperOptions(account: Account, lane: "builder" | "lab", now: number) {
  const helper = account.helpers[lane];
  const readyAt = Math.max(now, account.exportedAt + account.helpers.cooldown);
  if (!helper) return { helper: null, readyAt, options: [] as HelperOption[] };

  const base = emptyScenario(now);
  const options = account.upgrades
    .filter((u) => helperKindOf(u.lane) === lane && !u.helper?.recurrent)
    .map((u) => {
      const finish = planUpgrade(u, account, base).projection.finish;
      const trial = (assign: HelperAssign): number =>
        finish - planUpgrade(u, account, { ...base, helpers: [assign] }).projection.finish;
      return {
        key: u.key,
        name: u.name,
        saved: trial({ key: u.key, at: readyAt }),
        savedRecurrent: trial({ key: u.key, at: readyAt, recurrent: true }),
      };
    })
    .sort((a, b) => b.savedRecurrent - a.savedRecurrent || b.saved - a.saved);
  return { helper, readyAt, options };
}

export interface HelperPreview {
  helper: Helper;
  /** When the helper could start here: now, or the end of its cooldown. */
  readyAt: number;
  /** The upgrade as it would run with the helper kept on it. */
  trial: PlannedUpgrade;
  /** Seconds the finish moves earlier. */
  saved: number;
  /** Set when the helper is kept on another upgrade in the lane: moving it would slow that one down. */
  leaves: { name: string; cost: number } | null;
}

/**
 * What-if for one upgrade: the helper joins it and stays assigned. Nothing is stored, because the game is the only
 * place a helper can really be assigned. Null when there is nothing to try: no helper, it already keeps this
 * upgrade, or the upgrade is done.
 */
export function helperPreview(
  account: Account,
  upgrade: PlannedUpgrade,
  scenario: Scenario,
): HelperPreview | null {
  const lane = helperKindOf(upgrade.lane);
  const helper = lane ? account.helpers[lane] : null;
  if (!helper || upgrade.helper?.recurrent || upgrade.likelyDone) return null;

  const readyAt = Math.max(scenario.now, account.exportedAt + account.helpers.cooldown);
  const without: Scenario = { ...scenario, helpers: [] };
  const trial = planUpgrade(upgrade, account, {
    ...without,
    helpers: [{ key: upgrade.key, at: readyAt, recurrent: true }],
  });
  const saved = planUpgrade(upgrade, account, without).projection.finish - trial.projection.finish;

  const kept = account.upgrades.find(
    (u) => u.lane === upgrade.lane && u.key !== upgrade.key && u.helper?.recurrent,
  );
  let leaves: HelperPreview["leaves"] = null;
  if (kept) {
    const own = planUpgrade(kept, account, without);
    // Its turns that begin once the helper is free would go to this upgrade instead.
    const free = readyAt - account.exportedAt;
    const rest = own.windows.filter((w) => w.source !== "helper" || w.start < free);
    leaves = {
      name: kept.name,
      cost: Math.max(0, project(kept.remaining, rest).finish - own.projection.finish),
    };
  }
  return { helper, readyAt, trial, saved, leaves };
}

export interface ClockTowerOutlook {
  /** When it can be used next: now, or the end of the cooldown. */
  readyAt: number;
  /** Seconds the finishes move earlier if it is used at `readyAt`, across the Builder Base work. */
  saved: number;
  /** How many Builder Base upgrades finish earlier. */
  helped: number;
}

/** What the next Clock Tower boost would give. It speeds up the Master Builder and the Star Laboratory. */
export function clockTowerOutlook(account: Account, now: number): ClockTowerOutlook {
  const { boosts } = account;
  const readyAt = Math.max(now, account.exportedAt + Math.max(boosts.clockTower, boosts.clockTowerCooldown));
  const base = emptyScenario(now);
  const withUse: Scenario = { ...base, clockTower: { at: readyAt } };
  let saved = 0;
  let helped = 0;
  for (const upgrade of account.upgrades.filter((u) => u.lane === "bbBuilder" || u.lane === "bbLab")) {
    const gain =
      planUpgrade(upgrade, account, base).projection.finish -
      planUpgrade(upgrade, account, withUse).projection.finish;
    if (gain > 0) {
      saved += gain;
      helped++;
    }
  }
  return { readyAt, saved, helped };
}
