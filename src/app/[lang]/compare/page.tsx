"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ErrorState, WarningList } from "@/components/data";
import { SeriesChart } from "@/components/series-chart";
import { Button, Card, DataTable, SelectInput } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { addToCompare, MAX_COMPARE, removeFromCompare, useCompareIds } from "@/lib/compare-store";
import { formatDate, formatRatioPercent } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

const PERIODS = ["1M", "3M", "6M", "YTD", "1Y", "3Y", "ALL"] as const;

/** SF-05 — 2–5 funds, same window and normalization; a 6th fund is blocked without losing selections (NAV-01). */
export default function ComparePage() {
  const { t, locale } = useI18n();
  const ids = useCompareIds();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("1Y");
  const [full, setFull] = useState(false);
  const funds = useQuery({ queryKey: ["funds-all"], queryFn: () => call(() => api.GET("/v1/funds", { params: { query: { limit: 100 } } })) });
  const compare = useMutation({ mutationFn: () => call(() => api.POST("/v1/funds/compare", { body: { fundIds: ids, period } })) });
  const byId = new Map((funds.data?.items ?? []).map((f) => [f.id!, f]));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">{t("compare.title")}</h1>
      <Card title={t("compare.selected")}>
        <ul className="flex flex-wrap gap-2">
          {ids.map((id) => (
            <li key={id} className="flex items-center gap-1 rounded-full border border-border bg-surface-muted px-3 py-1 text-sm">
              {byId.get(id)?.code ?? id.slice(0, 8)}
              <button type="button" aria-label={`${t("compare.remove")} ${byId.get(id)?.code ?? ""}`} onClick={() => removeFromCompare(id)} className="text-danger">
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm">
            {t("compare.pick")}
            <SelectInput
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  setFull(!addToCompare(e.target.value));
                }
              }}
            >
              <option value="">—</option>
              {(funds.data?.items ?? [])
                .filter((f) => !ids.includes(f.id!))
                .map((f) => (
                  <option key={f.id} value={f.id!}>
                    {f.code} · {t(`fundType.${f.type}`)}
                  </option>
                ))}
            </SelectInput>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("analytics.period")}
            <SelectInput value={period} onChange={(e) => setPeriod(e.target.value as (typeof PERIODS)[number])}>
              {PERIODS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </SelectInput>
          </label>
          <Button disabled={ids.length < 2} busy={compare.isPending} onClick={() => compare.mutate()}>
            {t("compare.run")}
          </Button>
        </div>
        <p className="mt-2 text-xs text-text-muted">
          {ids.length}/{MAX_COMPARE} · {ids.length < 2 ? t("compare.needTwo") : t("funds.compareLimit")}
        </p>
        {full && (
          <p role="alert" className="text-sm text-danger">
            {t("funds.compareLimit")}
          </p>
        )}
      </Card>

      {compare.error && <ErrorState error={compare.error} />}
      {compare.data && (
        <Card title={`${t("compare.normalized")} — ${t("compare.commonStart")}: ${formatDate(compare.data.commonStart, locale)}`}>
          <WarningList warnings={compare.data.warnings} />
          <SeriesChart
            title={t("compare.normalized")}
            series={(compare.data.funds ?? []).map((f) => ({
              name: `${f.code} (${f.seriesKind === "nav" ? t("labels.officialNav") : t("labels.marketPrice")})`,
              kind: f.seriesKind === "nav" ? "official" : "market",
              points: (f.normalized ?? []).map((p) => ({ date: p.date!, value: p.value! })),
            }))}
          />
          <DataTable
            caption={t("compare.title")}
            headers={[t("funds.code"), t("analytics.priceReturn"), t("analytics.totalReturn"), t("analytics.volatility"), t("analytics.maxDrawdown")]}
            rows={(compare.data.funds ?? []).map((f) => [
              <Link key="c" href={`/${locale}/funds/${f.fundId}`} className="text-primary">
                {f.code}
              </Link>,
              ...[f.metrics?.priceReturn, f.metrics?.totalReturn, f.metrics?.annualizedVolatility, f.metrics?.maxDrawdown].map((m) =>
                m?.value != null ? formatRatioPercent(m.value, locale) : `${t("common.notAvailable")}`,
              ),
            ])}
          />
        </Card>
      )}
    </div>
  );
}
