"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataLabel, ErrorState } from "@/components/data";
import { SeriesChart } from "@/components/series-chart";
import { Loading } from "@/components/ui";
import { api, call, type S } from "@/lib/api/client";
import { formatRatioPercent } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

const PERIODS = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "ALL"] as const;

/** SF-04 — period selector; metrics without enough data show NOT_AVAILABLE reasons (TC-20). */
export function AnalyticsView({ fundId, fundType }: { fundId: string; fundType: S<"FundType"> }) {
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("1Y");
  const analytics = useQuery({
    queryKey: ["analytics", fundId, period],
    queryFn: () => call(() => api.GET("/v1/funds/{id}/analytics", { params: { path: { id: fundId }, query: { period } } })),
  });
  const from = analytics.data?.from;
  const nav = useQuery({
    queryKey: ["nav", fundId, from],
    enabled: !!from,
    queryFn: () => call(() => api.GET("/v1/funds/{id}/nav", { params: { path: { id: fundId }, query: { from: from! } } })),
  });
  const market = useQuery({
    queryKey: ["market", fundId, from],
    enabled: !!from && fundType !== "OpenFund",
    queryFn: () => call(() => api.GET("/v1/funds/{id}/prices", { params: { path: { id: fundId }, query: { from: from! } } })),
  });

  const metric = (m?: S<"MetricDto"> | null) =>
    m?.value != null ? formatRatioPercent(m.value, locale) : <span className="text-text-muted">{t("common.notAvailable")} ({m?.notAvailableReason ?? "—"})</span>;

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{t("analytics.period")}</legend>
        {PERIODS.map((p) => (
          <button key={p} type="button" aria-pressed={p === period} onClick={() => setPeriod(p)} className={`rounded border px-3 py-1 text-sm ${p === period ? "border-primary bg-primary text-primary-contrast" : "border-border"}`}>
            {p}
          </button>
        ))}
      </fieldset>
      {analytics.isPending ? (
        <Loading label={t("common.loading")} />
      ) : analytics.error ? (
        <ErrorState error={analytics.error} onRetry={() => void analytics.refetch()} />
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ["analytics.priceReturn", analytics.data.priceReturn],
              ["analytics.totalReturn", analytics.data.totalReturn],
              ["analytics.volatility", analytics.data.annualizedVolatility],
              ["analytics.maxDrawdown", analytics.data.maxDrawdown],
            ] as const
          ).map(([k, m]) => (
            <div key={k} className="rounded-lg border border-border p-3">
              <dt className="text-xs text-text-muted">{t(k)}</dt>
              <dd className="num text-lg font-semibold">{metric(m)}</dd>
            </div>
          ))}
        </dl>
      )}
      {nav.data && (
        <SeriesChart
          title={`${t("analytics.seriesNav")}${market.data ? ` / ${t("analytics.seriesMarket")}` : ""}`}
          series={[
            { name: t("labels.officialNav"), kind: "official", points: (nav.data.points ?? []).map((p) => ({ date: p.date!, value: p.value! })) },
            ...(market.data ? [{ name: t("labels.marketPrice"), kind: "market" as const, points: (market.data.points ?? []).map((p) => ({ date: p.date!, value: p.value! })) }] : []),
          ]}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <DataLabel kind="official" />
        {fundType !== "OpenFund" && <DataLabel kind="market" />}
      </div>
      <p className="text-xs text-text-muted">{t("analytics.methodology")}</p>
    </div>
  );
}
