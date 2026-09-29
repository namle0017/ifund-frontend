"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState } from "@/components/data";
import { DecisionForm, StepUpGate } from "@/components/step-up";
import { Alert, Button, Card, DataTable, Field, SelectInput, TextInput } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { formatDate, parseAmountInput } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/**
 * SF-A02 — review quarantined/suspicious data (never auto-accepted, NAV-11), manual NAV entry with evidence and NAV CSV
 * import (D1 phase-1 path while provider licensing is pending).
 */
export default function DataSourcesPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const cases = useQuery({ queryKey: ["review-cases"], queryFn: () => call(() => api.GET("/v1/admin/review-cases", { params: { query: { status: "Open" } } })) });
  const funds = useQuery({ queryKey: ["funds-all"], queryFn: () => call(() => api.GET("/v1/funds", { params: { query: { limit: 100 } } })) });
  const [fundId, setFundId] = useState("");
  const [date, setDate] = useState("");
  const [nav, setNav] = useState("");
  const [evidence, setEvidence] = useState("");
  const [csv, setCsv] = useState("fund_code,class_code,valuation_date,nav\n");
  const fund = useQuery({ queryKey: ["fund", fundId], enabled: !!fundId, queryFn: () => call(() => api.GET("/v1/funds/{id}", { params: { path: { id: fundId } } })) });

  const decide = useMutation({
    mutationFn: ({ id, approve, reason, evidence: ev }: { id: string; approve: boolean; reason: string; evidence: string }) =>
      call(() => api.POST("/v1/admin/review-cases/{id}/decision", { params: { path: { id } }, body: { approve, reason, evidence: ev || null } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["review-cases"] }),
  });
  const manual = useMutation({
    mutationFn: () =>
      call(() =>
        api.POST("/v1/admin/nav", {
          body: { fundClassId: fund.data!.classes![0].id!, valuationDate: date, rawValue: parseAmountInput(nav, locale)!, publishedAt: null, evidence },
        }),
      ),
  });
  const importCsv = useMutation({ mutationFn: () => call(() => api.POST("/v1/admin/nav/import", { body: { csv } })) });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">{t("admin.dataSources")}</h1>
      <Card title={t("admin.reviewCases")}>
        {cases.error && <ErrorState error={cases.error} />}
        {(cases.data ?? []).length === 0 && <p className="text-text-muted">{t("common.empty")}</p>}
        <StepUpGate>
          <ul className="flex flex-col gap-4">
            {(cases.data ?? []).map((c) => (
              <li key={c.id} className="rounded-lg border border-border p-4 text-sm">
                <p className="font-semibold">
                  {c.kind} · {formatDate(c.valuationDate, locale)}
                </p>
                <pre className="my-2 overflow-x-auto rounded-md bg-surface-muted p-3 text-xs">{c.detailsJson}</pre>
                <DecisionForm
                  busy={decide.isPending}
                  actions={[
                    { key: "approve", label: t("admin.approve") },
                    { key: "reject", label: t("admin.reject"), variant: "danger" },
                  ]}
                  onSubmit={(reason, ev, action) => decide.mutate({ id: c.id!, approve: action === "approve", reason, evidence: ev })}
                />
              </li>
            ))}
          </ul>
        </StepUpGate>
        {decide.error && <ErrorState error={decide.error} />}
      </Card>

      <Card title={t("admin.manualNav")}>
        <StepUpGate>
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              manual.mutate();
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
            <Field label={t("labels.valuationDate")}>{(id) => <TextInput id={id} type="date" required value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
            <Field label={t("labels.rawNav")}>{(id) => <TextInput id={id} inputMode="decimal" required value={nav} onChange={(e) => setNav(e.target.value)} />}</Field>
            <Field label={t("common.evidence")}>{(id) => <TextInput id={id} required value={evidence} onChange={(e) => setEvidence(e.target.value)} />}</Field>
            <Button type="submit" busy={manual.isPending} disabled={!fund.data}>
              {t("common.save")}
            </Button>
          </form>
          {manual.data && <Alert tone="info">{`${manual.data.outcome}${manual.data.reason ? ` — ${manual.data.reason}` : ""}`}</Alert>}
          {manual.error && <ErrorState error={manual.error} />}
        </StepUpGate>
      </Card>

      <Card title={t("admin.importNav")}>
        <label className="flex flex-col gap-1 text-sm">
          CSV
          <textarea className="min-h-32 field font-mono text-xs" value={csv} onChange={(e) => setCsv(e.target.value)} />
        </label>
        <Button className="mt-2" busy={importCsv.isPending} onClick={() => importCsv.mutate()}>
          {t("admin.importNav")}
        </Button>
        {importCsv.error && <ErrorState error={importCsv.error} />}
        {importCsv.data && (
          <DataTable caption={t("admin.importNav")} headers={[t("import.row"), t("common.status"), t("common.reason")]} rows={importCsv.data.map((r) => [r.line, r.outcome, r.reason ?? ""])} />
        )}
      </Card>
    </div>
  );
}
