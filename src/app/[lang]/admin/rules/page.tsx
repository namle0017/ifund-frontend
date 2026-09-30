"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState } from "@/components/data";
import { DecisionForm, StepUpGate } from "@/components/step-up";
import { Alert, Button, Card, DataTable, SelectInput } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

type Kind = "Calendar" | "DealingRule" | "FeeSchedule" | "TaxRule" | "ExchangeRule" | "RoundingPolicy" | "TolerancePolicy";

/** Templates only describe the shape; every value must come from the fund's official documents (A4, VERIFY-04). */
const TEMPLATES: Record<Kind | "CalendarDates" | "DistributionEvent", { path: string; body: unknown }> = {
  Calendar: { path: "/v1/admin/rules/calendars", body: { code: "", version: "v1", timeZoneId: "Asia/Ho_Chi_Minh", weeklyClosedDays: ["Saturday", "Sunday"], coveredFrom: "", coveredThrough: "", evidence: "" } },
  CalendarDates: { path: "/v1/admin/rules/calendars/{calendarId}/dates", body: { dates: [{ date: "", kind: "Closed", note: "" }], evidence: "" } },
  DealingRule: {
    path: "/v1/admin/rules/dealing-rules",
    body: {
      fundClassId: "", mechanism: "OpenFundSubscription", channel: null, calendarId: "", effectiveFrom: "", effectiveTo: null, version: "v1",
      settings: { dealingWeekdays: null, closedDayPolicy: "SkipToNextScheduled", cutoffTime: "14:30:00", cutoffBusinessDaysBefore: 0, valuationOffset: 0, publicationOffsetFromValuation: 1, allocationOffset: null, confirmationOffset: null, settlementOffset: 0 },
      evidence: "",
    },
  },
  FeeSchedule: {
    path: "/v1/admin/rules/fee-schedules",
    body: {
      fundClassId: "", mechanism: "OpenFundSubscription", channel: null, effectiveFrom: "", effectiveTo: null, version: "v1",
      rules: [{ ruleId: "", version: "v1", kind: "Subscription", collection: "InvestorDirect", buyBasis: "OnGrossAmount", measure: "Flat", tiers: [{ fromInclusive: null, toExclusive: null, rate: "" }], effectiveFrom: "", dateReference: "TransactionDate" }],
      evidence: "",
    },
  },
  TaxRule: { path: "/v1/admin/rules/tax-rules", body: { ruleCode: "", version: "v1", rule: { event: "Sell", fundTypes: ["OpenFund"], mechanisms: null, taxpayer: "IndividualResident", base: "GrossProceeds", rate: "", effectiveFrom: "", effectiveTo: null }, evidence: "" } },
  ExchangeRule: { path: "/v1/admin/rules/exchange-rules", body: { exchangeCode: "", version: "v1", boardLot: "", tickSize: "", effectiveFrom: "", effectiveTo: null, evidence: "" } },
  RoundingPolicy: { path: "/v1/admin/rules/rounding-policies", body: { scope: "FundClass", fundClassId: "", version: "v1", settings: { navMode: "HalfUp", unitDecimals: 2, buyUnitMode: "Down", moneyLineMode: "HalfUp", moneyDisplayMode: "HalfUp" }, evidence: "" } },
  TolerancePolicy: { path: "/v1/admin/rules/tolerance-policies", body: { version: "v1", tolerances: { Fees: "0", Units: "0", NetAmount: "0" }, evidence: "" } },
  DistributionEvent: { path: "/v1/admin/distribution-events", body: { fundClassId: "", recordDate: "", exDate: "", paymentDate: "", cashPerUnit: "", evidence: "" } },
};

type RuleRow = { id: string; version?: string; isVerified?: boolean; code?: string; ruleCode?: string; mechanism?: string; exchangeCode?: string; status?: string; date?: string; kind?: string };
type RulesView = Record<string, RuleRow[]>;

const LIST_KEYS: [string, Kind | null][] = [
  ["calendars", "Calendar"],
  ["dealingRules", "DealingRule"],
  ["feeSchedules", "FeeSchedule"],
  ["taxRules", "TaxRule"],
  ["exchangeRules", "ExchangeRule"],
  ["roundingPolicies", "RoundingPolicy"],
  ["tolerancePolicies", "TolerancePolicy"],
];

/** SF-A03 — versioned master data: new versions start unverified; verification needs reason, evidence and step-up. */
export default function RulesPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const rules = useQuery({ queryKey: ["admin-rules"], queryFn: async () => (await call(() => api.GET("/v1/admin/rules"))) as unknown as RulesView });
  const [kind, setKind] = useState<keyof typeof TEMPLATES>("FeeSchedule");
  const [json, setJson] = useState(JSON.stringify(TEMPLATES.FeeSchedule.body, null, 2));
  const [calendarId, setCalendarId] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-rules"] });

  const create = useMutation({
    mutationFn: async () => {
      const body = JSON.parse(json) as unknown;
      const path = TEMPLATES[kind].path.replace("{calendarId}", calendarId);
      const res = await fetch(`/api${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": await csrf() },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { toProblem, ApiError } = await import("@/lib/api/client");
        throw new ApiError(await toProblem(res));
      }

      return res.json() as Promise<unknown>;
    },
    onSuccess: refresh,
  });
  const verify = useMutation({
    mutationFn: ({ k, id, reason, evidence }: { k: Kind; id: string; reason: string; evidence: string }) =>
      call(() => api.POST("/v1/admin/rules/{kind}/{id}/verify", { params: { path: { kind: k, id } }, body: { reason, evidence } })),
    onSuccess: refresh,
  });
  const reviewDate = useMutation({
    mutationFn: ({ id, approve, reason }: { id: string; approve: boolean; reason: string }) =>
      call(() => api.POST("/v1/admin/rules/calendar-dates/{id}/review", { params: { path: { id } }, body: { approve, reason, evidence: null } })),
    onSuccess: refresh,
  });
  const reviewEvent = useMutation({
    mutationFn: ({ id, approve, reason, evidence }: { id: string; approve: boolean; reason: string; evidence: string }) =>
      call(() => api.POST("/v1/admin/distribution-events/{id}/review", { params: { path: { id } }, body: { approve, reason, evidence } })),
    onSuccess: refresh,
  });

  const unverified = LIST_KEYS.flatMap(([key, k]) => (rules.data?.[key] ?? []).filter((r) => !r.isVerified).map((r) => ({ ...r, k: k! })));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">{t("admin.rules")}</h1>
      <Alert tone="warning">Mọi phí, thuế, lịch phải lấy từ tài liệu chính thức của từng quỹ; không nhập giá trị giả định (A4, VERIFY-04).</Alert>

      <Card title={`${t("admin.verify")} (${unverified.length})`}>
        {rules.error && <ErrorState error={rules.error} />}
        <StepUpGate>
          <ul className="flex flex-col gap-3">
            {unverified.map((r) => (
              <li key={r.id} className="rounded-lg border border-border p-4 text-sm">
                <p className="font-semibold">
                  {r.k} · {r.code ?? r.ruleCode ?? r.mechanism ?? r.exchangeCode ?? ""} · {r.version}
                </p>
                <DecisionForm busy={verify.isPending} actions={[{ key: "verify", label: t("admin.verify") }]} onSubmit={(reason, evidence) => verify.mutate({ k: r.k, id: r.id, reason, evidence })} />
              </li>
            ))}
            {(rules.data?.pendingCalendarDates ?? []).map((d) => (
              <li key={d.id} className="rounded-lg border border-border p-4 text-sm">
                <p className="font-semibold">
                  Holiday API · {d.date} · {d.kind}
                </p>
                <DecisionForm
                  busy={reviewDate.isPending}
                  actions={[
                    { key: "approve", label: t("admin.approve") },
                    { key: "reject", label: t("admin.reject"), variant: "danger" },
                  ]}
                  onSubmit={(reason, _e, action) => reviewDate.mutate({ id: d.id, approve: action === "approve", reason })}
                />
              </li>
            ))}
            {(rules.data?.distributionEvents ?? [])
              .filter((d) => d.status === "PendingReview")
              .map((d) => (
                <li key={d.id} className="rounded-lg border border-border p-4 text-sm">
                  <p className="font-semibold">DistributionEvent · {d.id.slice(0, 8)}</p>
                  <DecisionForm
                    busy={reviewEvent.isPending}
                    actions={[
                      { key: "approve", label: t("admin.approve") },
                      { key: "reject", label: t("admin.reject"), variant: "danger" },
                    ]}
                    onSubmit={(reason, evidence, action) => reviewEvent.mutate({ id: d.id, approve: action === "approve", reason, evidence })}
                  />
                </li>
              ))}
          </ul>
        </StepUpGate>
        {(verify.error || reviewDate.error || reviewEvent.error) && <ErrorState error={verify.error ?? reviewDate.error ?? reviewEvent.error} />}
      </Card>

      <Card title={t("common.create")}>
        <div className="flex flex-wrap gap-2">
          <SelectInput
            aria-label={t("common.create")}
            value={kind}
            onChange={(e) => {
              const k = e.target.value as keyof typeof TEMPLATES;
              setKind(k);
              setJson(JSON.stringify(TEMPLATES[k].body, null, 2));
            }}
          >
            {Object.keys(TEMPLATES).map((k) => (
              <option key={k}>{k}</option>
            ))}
          </SelectInput>
          {kind === "CalendarDates" && (
            <SelectInput aria-label="Calendar" value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
              <option value="">—</option>
              {(rules.data?.calendars ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} {c.version}
                </option>
              ))}
            </SelectInput>
          )}
        </div>
        <textarea aria-label="JSON" className="mt-2 min-h-64 w-full field font-mono text-xs" value={json} onChange={(e) => setJson(e.target.value)} />
        {parseError && <Alert tone="danger">{parseError}</Alert>}
        <Button
          className="mt-2"
          busy={create.isPending}
          onClick={() => {
            try {
              JSON.parse(json);
              setParseError(null);
              create.mutate();
            } catch (e) {
              setParseError(String(e));
            }
          }}
        >
          {t("common.create")}
        </Button>
        {create.error && <ErrorState error={create.error} />}
        {create.isSuccess && <Alert tone="success">OK — {t("labels.unverified")}</Alert>}
      </Card>

      <Card title="Versions">
        {LIST_KEYS.map(([key]) => (
          <details key={key} className="mb-2">
            <summary className="text-sm font-semibold">
              {key} ({rules.data?.[key]?.length ?? 0})
            </summary>
            <DataTable
              caption={key}
              headers={["Id", "Version", "Verified"]}
              rows={(rules.data?.[key] ?? []).map((r) => [r.id.slice(0, 8), r.version ?? "", r.isVerified ? "✓" : t("labels.unverified")])}
            />
          </details>
        ))}
      </Card>
    </div>
  );
}

async function csrf(): Promise<string> {
  const res = await fetch("/api/v1/auth/csrf", { credentials: "include" });
  return ((await res.json()) as { token: string }).token;
}
