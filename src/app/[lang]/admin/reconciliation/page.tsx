"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorState } from "@/components/data";
import { DecisionForm, StepUpGate } from "@/components/step-up";
import { Alert, Card, DataTable, Loading } from "@/components/ui";
import { api, call, type S } from "@/lib/api/client";
import { formatDate, formatDecimal } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/**
 * SF-A04 — Admin sees field-level evidence and either corrects master data (new version), asks the investor to edit, or
 * accepts with evidence. No decision edits the investor's record or completes the transaction (FR-REC-003/005).
 */
export default function AdminReconciliationPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const queue = useQuery({ queryKey: ["admin-recon"], queryFn: () => call(() => api.GET("/v1/admin/reconciliation")) });
  const decide = useMutation({
    mutationFn: ({ id, decision, reason, evidence }: { id: string; decision: S<"AdminReconciliationDecision">; reason: string; evidence: string }) =>
      call(() => api.POST("/v1/admin/reconciliation/{caseId}/decision", { params: { path: { caseId: id } }, body: { decision, reason, evidence: evidence || null } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-recon"] }),
  });

  if (queue.isPending) {
    return <Loading label={t("common.loading")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("admin.reconciliation")}</h1>
      {queue.error && <ErrorState error={queue.error} />}
      {(queue.data ?? []).length === 0 && <Alert tone="success">{t("common.empty")}</Alert>}
      <StepUpGate>
        {(queue.data ?? []).map((c) => {
          const findings = JSON.parse(c.findingsJson ?? "[]") as S<"ReconFinding">[];
          return (
            <Card key={c.caseId} title={`${c.fundCode} · ${t(`mechanism.${c.mechanism}`)} · ${formatDate(c.tradeDate, locale)}`}>
              <DataTable
                caption={t("tx.reconciliation")}
                headers={[t("recon.field"), t("recon.expected"), t("recon.observed"), t("recon.difference"), t("recon.outcome")]}
                rows={findings.map((f) => [f.field, formatDecimal(f.expected, locale), formatDecimal(f.observed, locale), formatDecimal(f.difference, locale), `${f.outcome}${f.reason ? ` (${f.reason})` : ""}`])}
              />
              <div className="mt-3">
                <DecisionForm
                  busy={decide.isPending}
                  actions={[
                    { key: "MasterDataCorrected", label: t("admin.masterCorrected"), variant: "secondary" },
                    { key: "UserMustEditRecord", label: t("admin.userMustEdit"), variant: "secondary" },
                    { key: "AcceptedWithEvidence", label: t("admin.accept") },
                  ]}
                  onSubmit={(reason, evidence, action) => decide.mutate({ id: c.caseId!, decision: action as S<"AdminReconciliationDecision">, reason, evidence })}
                />
              </div>
            </Card>
          );
        })}
      </StepUpGate>
      {decide.error && <ErrorState error={decide.error} />}
    </div>
  );
}
