import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CalculationResultView } from "@/components/calculation-result";
import type { S } from "@/lib/api/client";
import { I18nProvider } from "@/lib/i18n/client";

const base = {
  status: "Complete",
  mechanism: "OpenFundSubscription",
  pricingBasis: "VerifiedNav",
  calculationPrice: "25123.46",
  rawNav: "25123.456",
  investmentAmount: "10000000",
  units: "398.03",
  grossAmount: "10000000",
  allocatedAmount: "9999890.7838",
  unallocatedAmount: "109.2162",
  fees: [],
  taxes: [],
  embeddedFeesInformation: [],
  lots: [],
  totalFees: "0",
  totalTaxes: "0",
  netAmount: "9999890.7838",
  display: { gross: "10000000", allocated: "9999891", unallocated: "109", totalFees: "0", totalTaxes: "0", net: "9999891" },
  ruleVersions: {},
  warnings: ["PRECISION_POLICY_DEFAULT"],
  missing: [],
} as unknown as S<"CalculationResult">;

const renderVi = (r: S<"CalculationResult">) =>
  render(
    <I18nProvider locale="vi">
      <CalculationResultView result={r} />
    </I18nProvider>,
  );

describe("CalculationResultView (SF-07)", () => {
  it("TC-03: shows BE display values and the official-NAV label", () => {
    renderVi(base);
    expect(screen.getByText("398,03")).toBeInTheDocument();
    expect(screen.getByText("25.123,46")).toBeInTheDocument();
    expect(screen.getAllByText("9.999.891 ₫").length).toBeGreaterThan(0);
    expect(screen.getByText("109 ₫")).toBeInTheDocument();
    expect(screen.getByText("NAV chính thức")).toBeInTheDocument();
    expect(screen.getByText(/quy tắc làm tròn mô phỏng mặc định/)).toBeInTheDocument();
  });

  it("FR-CALC-008 / NAV-03: an incomplete result never shows a definitive net amount", () => {
    renderVi({
      ...base,
      status: "Incomplete",
      units: null,
      totalFees: null,
      netAmount: null,
      display: { gross: null, allocated: null, unallocated: null, totalFees: null, totalTaxes: null, net: null },
      missing: ["FEE_SCHEDULE"],
    } as unknown as S<"CalculationResult">);
    expect(screen.getByText("Kết quả chưa đầy đủ")).toBeInTheDocument();
    expect(screen.getByText("Biểu phí đã xác minh")).toBeInTheDocument();
    expect(screen.getByText(/không giả định phí\/thuế bằng 0/)).toBeInTheDocument();
    expect(screen.queryByText("9.999.891 ₫")).not.toBeInTheDocument();
  });

  it("AC-FUND-002: exchange trades are labelled market price with NAV as reference", () => {
    renderVi({
      ...base,
      mechanism: "ExchangeBuy",
      pricingBasis: "MarketPriceUserEntered",
      calculationPrice: "20000",
      referenceNav: "20512.35",
      warnings: ["MARKET_PRICE_IS_NOT_NAV"],
    } as unknown as S<"CalculationResult">);
    expect(screen.getByText("Giá thị trường")).toBeInTheDocument();
    expect(screen.getByText("NAV tham chiếu")).toBeInTheDocument();
    expect(screen.getByText("Giá thị trường không phải NAV.")).toBeInTheDocument();
  });

  it("BR-007: unknown timeline milestones are shown as dashes, not guessed", () => {
    renderVi({ ...base, timeline: { status: "Incomplete", missing: ["TRADING_CALENDAR"], warnings: [], requiresUserConfirmation: false } } as unknown as S<"CalculationResult">);
    expect(screen.getByText("Lịch giao dịch đã xác minh")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(7);
  });
});
