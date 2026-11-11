import { describe, expect, it } from "vitest";
import { swipeStep } from "./swipe";

describe("swipeStep", () => {
  it("ignores a stroke that is mostly vertical, so scrolling never changes tab", () => {
    expect(swipeStep(-80, 90, 200, 0, 3)).toBe(0);
    expect(swipeStep(-80, 60, 200, 0, 3)).toBe(0);
  });

  it("does not wrap past the first or last tab", () => {
    expect(swipeStep(120, 0, 200, 0, 3)).toBe(0);
    expect(swipeStep(-120, 0, 200, 2, 3)).toBe(0);
  });
});
