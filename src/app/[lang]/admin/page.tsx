"use client";

import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "@/components/data";
import { Card, DataTable, Loading } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/** SF-A01 — sync health, quarantine, reconciliation, models, notification failures (FR-ADMIN-002). */
export default function AdminOverviewPage() {
  const { t, locale } = useI18n();
  const q = useQuery({ queryKey: ["admin-overview"], queryFn: () => call(() => api.GET("/v1/admin/overview")) });
  if (q.isPending) {
    return <Loading label={t("common.loading")} />;
  }

  if (q.error) {
    return <ErrorState error={q.error} />;
  }

  const o = q.data;
  const kpis: [string, unknown][] = [
    ["Active funds", o.activeFunds],
    [t("admin.reviewCases"), o.openDataReviewCases],
    ["Quarantined NAV", o.quarantinedObservations],
    ["Pending calendar dates", o.pendingCalendarDates],
    [t("admin.reconciliation"), o.openReconciliationCases],
    [t("admin.shadow"), o.shadowModels],
    ["Failed deliveries", o.failedDeliveries],
    ["Files awaiting scan", o.filesAwaitingScan],
    ["Pending deletions", o.pendingDeletionRequests],
    ["Unverified rules", o.unverifiedRuleRecords],
  ];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("admin.overview")}</h1>
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-border p-3">
            <dt className="text-xs text-text-muted">{k}</dt>
            <dd className="num text-xl font-semibold">{String(v ?? 0)}</dd>
          </div>
        ))}
      </dl>
      <Card title={t("admin.dataSources")}>
        <DataTable
          caption={t("admin.dataSources")}
          headers={["Code", "Kind", "Licence", t("common.status"), t("common.asOf")]}
          rows={(o.sources ?? []).map((s) => [s.code, s.kind, s.licenseConfirmed ? "✓" : "PENDING (OPEN-Q2-01)", s.lastSyncStatus ?? "—", formatDateTime(s.lastSyncAt, locale)])}
        />
      </Card>
    </div>
  );
}
