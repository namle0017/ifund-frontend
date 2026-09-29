"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { use } from "react";
import { DataLabel, Disclaimer, ErrorState, SourceStamp } from "@/components/data";
import { Button, Card, Loading } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { formatDate, formatNav, formatRatioPercent } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { useMe } from "@/lib/session";

/**
 * SF-08 — latest official NAV and forecast NAV side by side as separate fields (FR-FORECAST-002). No order CTA (FL-03).
 * Guests see the stored forecast; investors may request a rate-limited re-run (B4).
 */
export default function ForecastPage({ params }: PageProps<"/[lang]/funds/[fundId]/forecast">) {
  const { fundId } = use(params);
  const { t, locale } = useI18n();
  const { data: me } = useMe();
  const qc = useQueryClient();
  const forecast = useQuery({ queryKey: ["forecast", fundId], queryFn: () => call(() => api.GET("/v1/funds/{id}/forecast", { params: { path: { id: fundId } } })) });
  const rerun = useMutation({
    mutationFn: () => call(() => api.POST("/v1/funds/{id}/forecast/run", { params: { path: { id: fundId } } })),
    onSuccess: (data) => qc.setQueryData(["forecast", fundId], data),
  });

  if (forecast.isPending) {
    return <Loading label={t("common.loading")} />;
  }

  if (forecast.error) {
    return <ErrorState error={forecast.error} onRetry={() => void forecast.refetch()} />;
  }

  const f = forecast.data;
  const official = f.latestOfficialNav;
  const hasForecast = f.status === "Succeeded" && f.predictedNav;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">{t("forecast.title")}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={<span className="flex items-center gap-2">{t("labels.officialNav")} <DataLabel kind="official" /></span>}>
          {official ? (
            <>
              <p className="num display-lg">{formatNav(official.calculationNav, locale)}</p>
              <SourceStamp valuationDate={official.valuationDate} asOf={official.publishedAt} />
              {official.isStale && <DataLabel kind="stale" />}
            </>
          ) : (
            <p className="text-text-muted">{t("funds.noVerifiedData")}</p>
          )}
        </Card>
        <Card title={<span className="flex items-center gap-2">{t("labels.forecastNav")} <DataLabel kind="forecast" /></span>}>
          {hasForecast ? (
            <>
              <p className="num display-lg text-forecast">{formatNav(f.predictedNav, locale)}</p>
              <p className="text-sm">
                {t("forecast.target")}: {formatDate(f.targetValuationDate, locale)}
              </p>
              <p className="text-xs text-text-muted">
                {t("forecast.model")}: {f.modelVersion} · as_of <SourceStamp asOf={f.asOf} />
              </p>
            </>
          ) : (
            <p className="text-text-muted">
              {t("forecast.none")} {(f.warnings ?? []).join(", ")}
            </p>
          )}
          <p className="mt-2 text-xs text-text-muted">
            {t("forecast.accuracy")}: {f.accuracy?.meanAbsolutePercentError ? formatRatioPercent(f.accuracy.meanAbsolutePercentError, locale) : t("common.notAvailable")} ({t("forecast.evaluations")}: {f.accuracy?.evaluations ?? 0})
          </p>
        </Card>
      </div>
      {me && (
        <Button variant="secondary" className="self-start" busy={rerun.isPending} onClick={() => rerun.mutate()}>
          {t("forecast.run")}
        </Button>
      )}
      {rerun.error && <ErrorState error={rerun.error} />}
      <Disclaimer variant="forecast" />
    </div>
  );
}
