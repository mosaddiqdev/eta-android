import { BONUS, HELPER_CYCLE, HOUR } from "./constants";
import type { PotionUse, Scenario } from "./scenario";
import { helperKindOf } from "./scenario";
import type { Account, Upgrade, Window } from "./types";

/**
 * One boost "bucket": using more of the same item makes it last longer, never stronger.
 * `base` is the seconds already running at the export; each use either extends the running
 * window or opens a new one.
 */
function bucket(
  base: number,
  bonus: number,
  source: Window["source"],
  uses: PotionUse[],
  exportedAt: number,
): Window[] {
  const windows: Window[] = [];
  let current = base > 0 ? { start: 0, end: base } : null;
  for (const use of [...uses].sort((a, b) => a.at - b.at)) {
    const start = Math.max(0, use.at - exportedAt);
    const length = use.count * HOUR;
    if (length <= 0) continue;
    if (current && start < current.end) current.end += length;
    else {
      if (current) windows.push({ ...current, bonus, source });
      current = { start, end: start + length };
    }
  }
  if (current) windows.push({ ...current, bonus, source });
  return windows;
}

/**
 * The Clock Tower speeds up the Master Builder and the Star Laboratory alike. A boost already running comes
 * from the export; a planned one starts when the cooldown is over (or later, if asked) and never overlaps
 * a running boost.
 */
function clockTowerWindows(account: Account, scenario: Scenario): Window[] {
  const { boosts, clockTower } = account;
  const bonus = clockTower?.bonus ?? BONUS.clockTower;
  const windows = bucket(boosts.clockTower, bonus, "clockTower", [], account.exportedAt);
  if (clockTower && scenario.clockTower) {
    const start = Math.max(
      boosts.clockTowerCooldown,
      boosts.clockTower,
      scenario.clockTower.at - account.exportedAt,
    );
    windows.push({ start, end: start + clockTower.seconds, bonus, source: "clockTower" });
  }
  return windows;
}

function boostWindows(upgrade: Upgrade, account: Account, scenario: Scenario): Window[] {
  const { boosts } = account;
  const at = account.exportedAt;
  const of = (source: PotionUse["source"], lanes: PotionUse["lane"][]) =>
    scenario.potions.filter((use) => use.source === source && lanes.includes(use.lane));

  switch (upgrade.lane) {
    case "builder":
      return [
        ...bucket(boosts.builder, BONUS.builderPotion, "potion", of("potion", ["builder"]), at),
        ...bucket(boosts.builderSnack, BONUS.builderSnack, "snack", of("snack", ["builder"]), at),
      ];
    case "lab":
      return [
        ...bucket(boosts.lab, BONUS.researchPotion, "potion", of("potion", ["lab"]), at),
        ...bucket(boosts.labSnack, BONUS.studySoup, "snack", of("snack", ["lab", "pet"]), at),
      ];
    case "pet":
      // Study Soup speeds up the Pet House as well as the Laboratory.
      return [
        ...bucket(boosts.pet, BONUS.petPotion, "potion", of("potion", ["pet"]), at),
        ...bucket(boosts.labSnack, BONUS.studySoup, "snack", of("snack", ["lab", "pet"]), at),
      ];
    case "bbBuilder":
    case "bbLab":
      return clockTowerWindows(account, scenario);
  }
}

function helperWindows(upgrade: Upgrade, account: Account, scenario: Scenario): Window[] {
  const kind = helperKindOf(upgrade.lane);
  const helper = kind ? account.helpers[kind] : null;
  if (!helper) return [];

  const windows: Window[] = [];
  const add = (start: number) =>
    windows.push({ start, end: start + helper.seconds, bonus: helper.bonus, source: "helper" });
  const cooldown = account.helpers.cooldown;
  let recurrent = false;
  let nextStart = 0;

  const current = upgrade.helper;
  if (current) {
    if (current.activeRemaining > 0) {
      windows.push({
        start: 0,
        end: Math.min(current.activeRemaining, helper.seconds),
        bonus: helper.bonus,
        source: "helper",
      });
    }
    // The cooldown runs from when the helper was assigned, so it already counts the active hour.
    if (current.recurrent) {
      recurrent = true;
      nextStart = cooldown;
    }
  }

  const assign = scenario.helpers.find((h) => h.key === upgrade.key);
  if (assign && !current?.recurrent) {
    const start = Math.max(cooldown, assign.at ? assign.at - account.exportedAt : 0);
    add(start);
    if (assign.recurrent) {
      recurrent = true;
      nextStart = start + HELPER_CYCLE;
    }
  }

  // No window can matter after the upgrade would finish at normal speed.
  if (recurrent) for (let start = nextStart; start < upgrade.remaining; start += HELPER_CYCLE) add(start);
  return windows;
}

export function windowsFor(upgrade: Upgrade, account: Account, scenario: Scenario): Window[] {
  return [...boostWindows(upgrade, account, scenario), ...helperWindows(upgrade, account, scenario)];
}
