import { describe, expect, it } from "vitest";
import { statusTitle } from "./statusTitle";

const next = { name: "Cannon", finishAt: 10_000 };

describe("statusTitle", () => {
  it("shows minutes alone under an hour, and a floor under one minute", () => {
    expect(statusTitle(next, 10_000 - 14 * 60, "My village")).toBe("14m · Cannon");
    expect(statusTitle(next, 10_000 - 20, "My village")).toBe("<1m · Cannon");
  });

  it("says done once it is", () => {
    expect(statusTitle(next, 10_001, "My village")).toBe("Done · Cannon");
  });
});
