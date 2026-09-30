import { beforeEach, describe, expect, it } from "vitest";
import { meetsPasswordHint, safeReturn } from "@/lib/auth-utils";
import { addToCompare, clearCompare, MAX_COMPARE } from "@/lib/compare-store";

describe("safeReturn (open-redirect protection)", () => {
  it("keeps same-site relative paths only", () => {
    expect(safeReturn("/vi/app", "/")).toBe("/vi/app");
    expect(safeReturn("//evil.example", "/")).toBe("/");
    expect(safeReturn("https://evil.example", "/")).toBe("/");
    expect(safeReturn("/\\evil.example", "/")).toBe("/");
    expect(safeReturn(null, "/x")).toBe("/x");
  });
});

describe("password hint (E2)", () => {
  it("mirrors the BE policy shape", () => {
    expect(meetsPasswordHint("Str0ng!Passphrase")).toBe(true);
    expect(meetsPasswordHint("short1!A")).toBe(false);
    expect(meetsPasswordHint("nouppercase123!")).toBe(false);
    expect(meetsPasswordHint("NoSpecial12345A")).toBe(false);
  });
});

describe("compare basket (AC-FUND-001 / NAV-01)", () => {
  beforeEach(() => clearCompare());

  it("blocks the 6th fund without dropping the first five", () => {
    for (let i = 0; i < MAX_COMPARE; i++) {
      expect(addToCompare(`f${i}`)).toBe(true);
    }

    expect(addToCompare("f6")).toBe(false);
    expect(JSON.parse(sessionStorage.getItem("ifund.compare")!)).toHaveLength(5);
  });
});
