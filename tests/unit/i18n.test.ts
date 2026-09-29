import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/dictionaries/en.json";
import vi from "@/lib/i18n/dictionaries/vi.json";

const keys = (o: object, prefix = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));

const valueAt = (d: object, path: string): unknown => path.split(".").reduce<unknown>((n, p) => (n as Record<string, unknown>)[p], d);

// Codes emitted by the BE domain (WarningCodes / MissingCodes) must all be translated (NFR-UX-001).
const BE_WARNINGS = [
  "PRECISION_POLICY_DEFAULT", "NAV_STALE", "NAV_NOT_VERIFIED", "FORECAST_NAV_USED", "MARKET_PRICE_USER_ASSUMPTION", "MARKET_PRICE_IS_NOT_NAV",
  "BROKER_FEE_USER_ASSUMPTION", "PRICE_NOT_ON_TICK", "LOT_SIZE_UNVERIFIED", "SELL_EXCEEDS_HOLDINGS_SIMULATION_ONLY", "TIMELINE_REQUIRES_USER_CONFIRMATION",
  "AFTER_CUTOFF_SHIFTED", "NON_DEALING_DAY_SHIFTED", "CALENDAR_COVERAGE_ENDED", "FEE_RULE_NON_MONOTONIC", "BUDGET_BELOW_ONE_UNIT_STEP", "ILLUSTRATIVE_SIMULATION", "SYNTHETIC_DATA",
];
const BE_MISSING = [
  "VERIFIED_NAV", "MARKET_PRICE", "FEE_SCHEDULE", "TAX_RULE", "TRADING_CALENDAR", "BROKER_COMMISSION", "EXCHANGE_LOT_SIZE", "EXCHANGE_SETTLEMENT_RULE",
  "HOLDING_PERIOD", "COST_BASIS", "MECHANISM_RULES_NOT_CONFIGURED",
];

describe("VI/EN dictionaries", () => {
  it("have identical key sets (no missing translations)", () => {
    expect(keys(en).sort()).toEqual(keys(vi).sort());
  });

  it("have no empty strings", () => {
    for (const d of [vi, en]) {
      expect(keys(d).every((k) => typeof valueAt(d, k) === "string" && (valueAt(d, k) as string).length > 0)).toBe(true);
    }
  });

  it("translate every BE warning and missing-requirement code", () => {
    for (const code of BE_WARNINGS) {
      expect(vi.warnings).toHaveProperty(code);
      expect(en.warnings).toHaveProperty(code);
    }

    for (const code of BE_MISSING) {
      expect(vi.missing).toHaveProperty(code);
      expect(en.missing).toHaveProperty(code);
    }
  });

  it("marks disclaimers as pending legal review (B6)", () => {
    expect(vi.disclaimer.pendingLegal).toContain("PENDING LEGAL REVIEW");
    expect(en.disclaimer.pendingLegal).toContain("PENDING LEGAL REVIEW");
  });
});
