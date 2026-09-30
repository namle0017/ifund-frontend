"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Disclaimer, ErrorState, WarningList } from "@/components/data";
import { SeriesChart } from "@/components/series-chart";
import { DateInput } from "@/components/date-input";
import { Alert, Button, Card, Checkbox, DataTable, Field, SelectInput, TextInput } from "@/components/ui";
import { api, call, type S } from "@/lib/api/client";
import { formatVnd, parseAmountInput, percentToRatio, formatRatioPercent } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/** SF-20 — phase-1 SIP scenarios (user-entered + historical CAGR). Fixed contributions only; ML long-term is P1 (NAV-09). */
export default function PlansPage() {
  const { t, locale } = useI18n();
  const funds = useQuery({ queryKey: ["funds-open"], queryFn: () => call(() => api.GET("/v1/funds", { params: { query: { type: "OpenFund", limit: 100 } } })) });
  const [fundId, setFundId] = useState("");
  const [initial, setInitial] = useState("0");
  const [periodic, setPeriodic] = useState("1000000");
  const [frequency, setFrequency] = useState<S<"ContributionFrequency">>("Monthly");
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [periods, setPeriods] = useState("60");
  const [target, setTarget] = useState("");
  const [scenarios, setScenarios] = useState<{ name: string; percent: string }[]>([{ name: "A", percent: "6" }]);
  const [historical, setHistorical] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const simulate = useMutation({
    mutationFn: () => {
      const amount = (v: string) => parseAmountInput(v, locale);
      const plan = {
        initialAmount: amount(initial) ?? "0",
        periodicAmount: amount(periodic)!,
        frequency,
        startDate: start,
        periods: Number.parseInt(periods, 10),
        targetAmount: target ? amount(target) : null,
        withdrawalAmount: null,
        withdrawalPeriods: 0,
      };
      return call(() =>
        api.POST("/v1/plans/sip/simulate", {
          body: {
            fundId,
            classId: null,
            plan,
            scenarios: scenarios.map((s) => ({ name: s.name, annualReturn: percentToRatio(s.percent)! })),
            includeHistoricalReference: historical,
          } as S<"SipSimulateRequest">,
        }),
      );
    },
  });

  const valid = fundId && parseAmountInput(periodic, locale) && scenarios.every((s) => percentToRatio(s.percent) !== null);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">{t("plans.title")}</h1>
      <Alert tone="info">
        {t("plans.noStepUp")} {t("plans.longTermP1")}
      </Alert>
      <Card>
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setError(valid ? null : t("errors.VALIDATION_ERROR"));
            if (valid) {
              simulate.mutate();
            }
          }}
        >
          <Field label={t("calc.fund")}>
            {(id) => (
              <SelectInput id={id} required value={fundId} onChange={(e) => setFundId(e.target.value)}>
                <option value="">—</option>
                {(funds.data?.items ?? []).map((f) => (
                  <option key={f.id} value={f.id!}>
                    {f.code}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t("plans.initial")}>{(id) => <TextInput id={id} inputMode="decimal" value={initial} onChange={(e) => setInitial(e.target.value)} />}</Field>
          <Field label={t("plans.periodic")}>{(id) => <TextInput id={id} inputMode="decimal" required value={periodic} onChange={(e) => setPeriodic(e.target.value)} />}</Field>
          <Field label={t("plans.frequency")}>
            {(id) => (
              <SelectInput id={id} value={frequency} onChange={(e) => setFrequency(e.target.value as S<"ContributionFrequency">)}>
                {(["Weekly", "Monthly", "Quarterly"] as const).map((f) => (
                  <option key={f} value={f}>
                    {t(`plans.${f}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t("plans.start")}>{(id, d) => <DateInput id={id} aria-describedby={d} value={start} onChange={(v) => setStart(v)} />}</Field>
          <Field label={t("plans.periods")}>{(id) => <TextInput id={id} type="number" min={1} max={600} value={periods} onChange={(e) => setPeriods(e.target.value)} />}</Field>
          <Field label={t("plans.target")}>{(id) => <TextInput id={id} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />}</Field>
          <fieldset className="md:col-span-3">
            <legend className="text-sm font-medium">{t("plans.scenario")}</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {scenarios.map((s, i) => (
                <span key={i} className="flex items-center gap-1">
                  <TextInput aria-label={`${t("plans.scenario")} ${i + 1}`} className="w-24" inputMode="decimal" value={s.percent} onChange={(e) => setScenarios((all) => all.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))} />
                  %
                </span>
              ))}
              {scenarios.length < 5 && (
                <Button type="button" variant="ghost" onClick={() => setScenarios((all) => [...all, { name: String.fromCharCode(65 + all.length), percent: "0" }])}>
                  + {t("plans.addScenario")}
                </Button>
              )}
            </div>
          </fieldset>
          <div className="md:col-span-3">
            <Checkbox label={t("plans.historical")} checked={historical} onChange={(e) => setHistorical(e.target.checked)} />
          </div>
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" busy={simulate.isPending} className="md:col-span-3">
            {t("plans.simulate")}
          </Button>
        </form>
        {simulate.error && <ErrorState error={simulate.error} />}
      </Card>

      {simulate.data && (
        <Card title={t("common.details")}>
          <WarningList warnings={simulate.data.warnings} />
          <DataTable
            caption={t("plans.title")}
            headers={[t("plans.scenario"), t("plans.invested"), t("plans.final"), t("plans.targetReached"), t("common.status")]}
            rows={(simulate.data.scenarios ?? []).map((s) => [
              `${s.scenario?.name} (${formatRatioPercent(s.scenario?.annualReturn, locale)})${s.scenario?.isHistoricalReference ? " *" : ""}`,
              formatVnd(s.totalInvested, locale),
              s.status === "Complete" ? formatVnd(s.finalValue, locale) : t("common.notAvailable"),
              s.targetReached == null ? "—" : s.targetReached ? t("common.yes") : t("common.no"),
              s.status === "Complete" ? t("labels.simulation") : `${t("labels.incomplete")}: ${(s.missing ?? []).map((m) => t(`missing.${m}`, m)).join(", ")}`,
            ])}
          />
          <SeriesChart
            title={t("plans.final")}
            series={(simulate.data.scenarios ?? []).map((s) => ({
              name: s.scenario?.name ?? "",
              kind: s.scenario?.isHistoricalReference ? "benchmark" : "forecast",
              points: (s.rows ?? []).map((r) => ({ date: r.dealingDate ?? r.nominalDate!, value: r.projectedValue! })),
            }))}
          />
        </Card>
      )}
      <Disclaimer variant="estimate" />
    </div>
  );
}
