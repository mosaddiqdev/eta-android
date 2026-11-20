import { describe, expect, it } from "vitest";
import { fingerprint, looksLikeExport } from "./clipboardImport";

describe("clipboard import helpers", () => {
  it("gives equal text equal fingerprints and different text different ones", () => {
    expect(fingerprint('{"tag":"#A"}')).toBe(fingerprint('{"tag":"#A"}'));
    expect(fingerprint('{"tag":"#A"}')).not.toBe(fingerprint('{"tag":"#B"}'));
  });

  it("does not keep the text itself", () => {
    expect(fingerprint("secret village")).not.toContain("secret");
  });

  it("only tries text that looks like a JSON object", () => {
    expect(looksLikeExport('  {"tag":"#A"}')).toBe(true);
    expect(looksLikeExport("https://example.com")).toBe(false);
    expect(looksLikeExport("")).toBe(false);
  });
});
