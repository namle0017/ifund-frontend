import { describe, expect, it } from "vitest";
import { formatDecimal, formatNav, formatRatioPercent, formatVnd, parseAmountInput, percentToRatio, shiftDecimal, sumDecimals } from "@/lib/format";

describe("formatting (display only — BE owns rounding)", () => {
  it("groups VND with locale separators without floating point", () => {
    expect(formatVnd("9999891", "vi")).toBe("9.999.891 ₫");
    expect(formatVnd("9999891", "en")).toBe("9,999,891 ₫");
    expect(formatDecimal("123456789012345678.1234", "en")).toBe("123,456,789,012,345,678.1234");
  });

  it("shows NAV/units with 2 decimals by padding, never rounding (TC-03 values come from BE)", () => {
    expect(formatNav("25123.46", "vi")).toBe("25.123,46");
    expect(formatNav("25150", "en")).toBe("25,150.00");
  });

  it("shifts decimals exactly", () => {
    expect(shiftDecimal("0.0345", 2)).toBe("3.45");
    expect(shiftDecimal("0.15", -2)).toBe("0.0015");
    expect(shiftDecimal("-0.373362535", 2)).toBe("-37.3362535");
    expect(shiftDecimal("12", 2)).toBe("1200");
  });

  it("formats ratios as percent and converts percent input", () => {
    expect(formatRatioPercent("0.0345", "vi")).toBe("3,45 %");
    expect(formatRatioPercent("-0.5", "en")).toBe("-50.00 %");
    expect(percentToRatio("0,15")).toBe("0.0015");
    expect(percentToRatio("abc")).toBeNull();
  });

  it("sums decimal strings exactly", () => {
    expect(sumDecimals(["0.1", "0.2"])).toBe("0.3");
    expect(sumDecimals(["12562", "3769", null])).toBe("16331");
    expect(sumDecimals(["-1.5", "1"])).toBe("-0.5");
  });

  it("parses typed amounts per locale", () => {
    expect(parseAmountInput("10.000.000", "vi")).toBe("10000000");
    expect(parseAmountInput("10,000,000.5", "en")).toBe("10000000.5");
    expect(parseAmountInput("1,5", "vi")).toBe("1.5");
    expect(parseAmountInput("12a", "vi")).toBeNull();
  });
});
