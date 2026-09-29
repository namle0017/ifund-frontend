"use client";

import Link from "next/link";
import type { S } from "@/lib/api/client";
import { formatDate, formatRatioPercent, formatUnits, formatVnd, formatDecimal } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { DataLabel } from "./data";
import { Alert, DataTable } from "./ui";

/** SF-14/15 KPIs. Missing prices or provisional data make metrics "not available", never 0 (TC-20, FR-PORT-007). */
export function PortfolioSummaryView({ summary }: { summary: S<"PortfolioSummary"> }) {
  const { t, locale } = useI18n();
  const na = t("common.notAvailable");
  const kpis: [string, React.ReactNode][] = [
    [t("portfolio.totalCost"), formatVnd(summary.totalCost, locale)],
    [t("portfolio.marketValue"), summary.totalMarketValue != null ? formatVnd(summary.totalMarketValue, locale) : na],
    [t("portfolio.unrealized"), summary.unrealizedPnl != null ? formatVnd(summary.unrealizedPnl, locale) : na],
    [t("portfolio.realized"), formatVnd(summary.realizedPnl, locale)],
    [t("portfolio.xirr"), summary.xirr?.value != null ? formatRatioPercent(summary.xirr.value, locale) : `${na} (${summary.xirr?.notAvailableReason ?? "—"})`],
    [t("portfolio.pendingCount"), summary.pendingReconciliation],
    [t("portfolio.provisionalCount"), summary.provisionalTransactions],
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border p-3">
            <dt className="text-xs text-text-muted">{label}</dt>
            <dd className="num text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {(summary.notes ?? []).length > 0 && <Alert tone="warning">{(summary.notes ?? []).join(" · ")}</Alert>}
      {(summary.holdings ?? []).length === 0 ? (
        <p className="text-text-muted">{t("portfolio.noHoldings")}</p>
      ) : (
        <DataTable
          caption={t("portfolio.holdings")}
          headers={[t("funds.code"), t("calc.units"), t("portfolio.averageCost"), t("calc.priceUsed"), t("portfolio.marketValue"), t("portfolio.unrealized")]}
          rows={(summary.holdings ?? []).map((h) => [
            <span key="c" className="flex flex-col gap-1">
              <Link href={`/${locale}/funds/${h.fundId}`} className="text-primary">
                {h.fundCode}
              </Link>
              <span className="flex gap-1">
                {h.hasProvisional && <DataLabel kind="unverified" />}
                {h.priceIsStale && <DataLabel kind="stale" />}
              </span>
            </span>,
            formatUnits(h.units, locale),
            h.averageCost != null ? formatVnd(h.averageCost, locale) : na,
            h.price != null ? (
              <span key="p">
                {formatDecimal(h.price, locale)} <span className="text-xs text-text-muted">({h.priceKind === "nav" ? t("portfolio.priceKindNav") : t("portfolio.priceKindMarket")}, {formatDate(h.priceDate, locale)})</span>
              </span>
            ) : (
              na
            ),
            h.marketValue != null ? formatVnd(h.marketValue, locale) : na,
            h.unrealizedPnl != null ? formatVnd(h.unrealizedPnl, locale) : na,
          ])}
        />
      )}
    </div>
  );
}
