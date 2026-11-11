import { describe, expect, it } from "vitest";
import { idleSince } from "./idle";

describe("idleSince", () => {
  it("gives the oldest finish to the first idle worker", () => {
    expect(idleSince([300, 100, 200], 2)).toEqual([100, 200]);
  });

  it("has no time for a worker that was already idle at the export", () => {
    expect(idleSince([100], 3)).toEqual([100, null, null]);
  });
});
