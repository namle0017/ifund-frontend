"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalculationResultView } from "@/components/calculation-result";
import { Disclaimer, ErrorState, WarningList } from "@/components/data";
import { Alert, Button, Card, DataTable, Field, SelectInput, TextInput } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { formatDate, formatDecimal, formatUnits, formatVnd, sumDecimals } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/**
 * SF-21 — only verified distributions paid directly to holders (FR-DIST-001). Fund-level dividends already in NAV are
 * never added (NAV-10). Cash vs reinvestment scenarios use the NET amount (AC-DIST-002).
 */
export default function DistributionsPage() {
  const { t, locale } = useI18n();
  const [portfolioId, setPortfolioId] = useState("");
  const [eventId, setEventId] = useState("");
  const [reinvestDate, setReinvestDate] = useState("");
  const portfolios = useQuery({ queryKey: ["portfolios"], queryFn: () => call(() => api.GET("/v1/portfolios")) });
  const events = useQuery({
    queryKey: ["distributions", portfolioId],
    enabled: !!portfolioId,
    queryFn: () => call(() => api.GET("/v1/portfolios/{id}/distributions", { params: { path: { id: portfolioId } } })),
  });
  const simulate = useMutation({
    mutationFn: (save: boolean) => call(() => api.POST("/v1/distributions/simulate", { body: { portfolioId, eventId, reinvestDate: reinvestDate || null, save } })),
  });
  const s = simulate.data?.scenarios;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("distributions.title")}</h1>
      <Card>
        <Field label={t("nav.portfolios")}>
          {(id) => (
            <SelectInput id={id} value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
              <option value="">—</option>
              {(portfolios.data ?? []).map((p) => (
                <option key={p.id} value={p.id!}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        {events.data && events.data.length === 0 && <Alert tone="info">{t("distributions.none")}</Alert>}
        {!!events.data?.length && (
          <DataTable
            caption={t("distributions.title")}
            headers={["", t("distributions.exDate"), t("distributions.paymentDate"), t("distributions.perUnit")]}
            rows={events.data.map((e) => [
              <input key="r" type="radio" name="event" aria-label={formatDate(e.exDate, locale)} checked={eventId === e.id} onChange={() => setEventId(e.id!)} />,
              formatDate(e.exDate, locale),
              formatDate(e.paymentDate, locale),
              formatDecimal(e.cashPerUnit, locale),
            ])}
          />
        )}
        {eventId && (
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <Field label={`${t("distributions.reinvest")} — ${t("common.date")}`}>{(id) => <TextInput id={id} type="date" value={reinvestDate} onChange={(e) => setReinvestDate(e.target.value)} />}</Field>
            <Button busy={simulate.isPending} onClick={() => simulate.mutate(false)}>
              {t("plans.simulate")}
            </Button>
          </div>
        )}
        {simulate.error && <ErrorState error={simulate.error} />}
      </Card>
      {s && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card title={t("distributions.keepCash")}>
            <WarningList warnings={s.warnings} missing={s.missing} />
            <dl className="num grid gap-1 text-sm">
              <div>
                {t("distributions.eligible")}: {formatUnits(s.entitlement?.eligibleUnits, locale)}
              </div>
              <div>
                {t("distributions.gross")}: {formatVnd(s.entitlement?.grossAmount, locale)}
              </div>
              <div>
                {t("calc.taxes")}: {s.entitlement?.taxes?.length ? formatVnd(sumDecimals(s.entitlement.taxes.map((x) => x.amount)), locale) : t("common.notAvailable")}
              </div>
              <div className="font-semibold">
                {t("distributions.net")}: {s.entitlement?.netAmount != null ? formatVnd(s.entitlement.netAmount, locale) : t("common.notAvailable")}
              </div>
            </dl>
          </Card>
          <Card title={t("distributions.reinvest")}>
            {s.reinvestment ? <CalculationResultView result={s.reinvestment} /> : <p className="text-text-muted">{t("common.notAvailable")}</p>}
          </Card>
        </div>
      )}
      <Disclaimer variant="estimate" />
    </div>
  );
}
