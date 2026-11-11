import { describe, expect, it } from "vitest";
import type { PlanEvent } from "../../village/plan";
import { splitTime } from "./format";
import { groupSchedule, levelTag } from "./schedule";

const NOW = Date.UTC(2026, 9, 25, 12, 0, 0) / 1000;
const HOUR = 3600;
const event = (at: number, label: string, kind: PlanEvent["kind"] = "finish"): PlanEvent => ({
  at,
  kind,
  lane: "builder",
  label,
});

describe("groupSchedule", () => {
  it("starts with today even when nothing happens today", () => {
    const days = groupSchedule([event(NOW + 30 * HOUR, "Mortar")], NOW);
    expect(days[0].day).toBe("Today");
    expect(days[0].clusters).toEqual([]);
    expect(days).toHaveLength(2);
  });

  it("merges events in the same minute under one time", () => {
    const days = groupSchedule(
      [
        event(NOW + 600, "A", "boostEnds"),
        event(NOW + 610, "B", "boostEnds"),
        event(NOW + 650, "C", "boostEnds"),
      ],
      NOW,
    );
    expect(days[0].clusters).toHaveLength(1);
    expect(days[0].clusters[0].events.map((e) => e.label)).toEqual(["A", "B", "C"]);
  });

  it("splits days", () => {
    const days = groupSchedule(
      [event(NOW + HOUR, "A"), event(NOW + 14 * HOUR, "B"), event(NOW + 40 * HOUR, "C")],
      NOW,
    );
    expect(days.map((d) => d.day)[0]).toBe("Today");
    expect(days.length).toBeGreaterThanOrEqual(3);
    expect(
      days
        .flatMap((d) => d.clusters)
        .flatMap((c) => c.events)
        .map((e) => e.label),
    ).toEqual(["A", "B", "C"]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: 100 }, (_, i) => event(NOW + (i + 1) * HOUR, `E${i}`));
    const total = groupSchedule(many, NOW)
      .flatMap((d) => d.clusters)
      .flatMap((c) => c.events).length;
    expect(total).toBe(40);
  });
});

describe("splitTime", () => {
  it("separates the period from a 12-hour clock", () => {
    expect(splitTime("12:10 PM")).toEqual({ clock: "12:10", period: "PM" });
    expect(splitTime("9:05\u202fam")).toEqual({ clock: "9:05", period: "AM" });
    expect(splitTime("9:05 a.m.")).toEqual({ clock: "9:05", period: "AM" });
  });
});

describe("levelTag", () => {
  const base = { gearUp: false, firstBuild: false, toLevel: 15 };
  it("says Gear up and New instead of a level", () => {
    expect(levelTag({ ...base, gearUp: true })).toBe("Gear up");
    expect(levelTag({ ...base, firstBuild: true, toLevel: 1 })).toBe("New");
  });
});
