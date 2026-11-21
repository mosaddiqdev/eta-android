import { describe, expect, it } from "vitest";
import { snapshotCatalog } from "../../test/catalog";
import one from "../../village/fixtures/account-1.json";
import two from "../../village/fixtures/account-2.json";
import { parseExport } from "../../village/parse";
import { cleanNickname, NICKNAME_MAX, noVillages, villageLabel, withNickname, withVillage } from "./villages";

const a = parseExport(one, snapshotCatalog).account;
const b = parseExport(two, snapshotCatalog).account;
const both = withVillage(withVillage(noVillages, a, "{}", 1), b, "{}", 2);

describe("cleanNickname", () => {
  it("tidies spaces and cuts to length", () => {
    expect(cleanNickname("  My   Main  ")).toBe("My Main");
    expect(cleanNickname("x".repeat(50))).toHaveLength(NICKNAME_MAX);
  });
  it("is nothing when empty", () => {
    expect(cleanNickname("   ")).toBeUndefined();
  });
});

describe("withNickname", () => {
  it("names one village and leaves the other alone", () => {
    const named = withNickname(both, a.tag, "Main");
    expect(named.villages.find((v) => v.tag === a.tag)?.nickname).toBe("Main");
    expect(named.villages.find((v) => v.tag === b.tag)?.nickname).toBeUndefined();
  });
  it("takes the name off when given nothing", () => {
    const cleared = withNickname(withNickname(both, a.tag, "Main"), a.tag, "");
    expect(cleared.villages.find((v) => v.tag === a.tag)).not.toHaveProperty("nickname");
  });
});

describe("withVillage", () => {
  it("keeps the nickname when the same village is imported again", () => {
    const again = withVillage(withNickname(both, a.tag, "Main"), a, "{}", 9);
    expect(again.villages.find((v) => v.tag === a.tag)?.nickname).toBe("Main");
  });
});

describe("villageLabel", () => {
  it("is the nickname, or the tag until there is one", () => {
    expect(villageLabel({ tag: "#A", nickname: "Main" })).toBe("Main");
    expect(villageLabel({ tag: "#A" })).toBe("#A");
  });
});
