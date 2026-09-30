"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorState } from "@/components/data";
import { DecisionForm, StepUpGate } from "@/components/step-up";
import { Alert, Badge, Card, Loading } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { formatDateTime, formatDecimal, formatRatioPercent } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/**
 * SF-A05 — models: baseline active, candidates in shadow (C9). Promotion needs Model Admin approval and the PO-approved
 * numeric criteria (F1); blocking reasons are shown instead of hiding the button (NAV-12).
 */
export default function ModelsPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const models = useQuery({ queryKey: ["models"], queryFn: () => call(() => api.GET("/v1/admin/models")) });
  const act = useMutation({
    mutationFn: ({ id, action, reason }: { id: string; action: "promote" | "reject"; reason: string }) =>
      action === "promote"
        ? call(() => api.POST("/v1/admin/models/{id}/promote", { params: { path: { id } }, body: { reason } }))
        : call(() => api.POST("/v1/admin/models/{id}/reject", { params: { path: { id } }, body: { reason } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["models"] }),
  });

  if (models.isPending) {
    return <Loading label={t("common.loading")} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">{t("admin.models")}</h1>
      <Alert tone="info">Không cam kết mô hình ML luôn chính xác hơn baseline (F1). / ML is not guaranteed to beat the baseline.</Alert>
      {models.error && <ErrorState error={models.error} />}
      <StepUpGate>
        {(models.data ?? []).map((m) => (
          <Card
            key={m.id}
            title={
              <span className="flex items-center gap-2">
                {m.modelName} {m.version}
                <Badge tone={m.status === "Active" ? "success" : m.status === "Shadow" ? "forecast" : "neutral"}>{m.status}</Badge>
                {m.isBaseline && <Badge>baseline</Badge>}
              </span>
            }
          >
            <p className="text-xs text-text-muted">
              {formatDateTime(m.createdAt, locale)} · cutoff {m.trainingDataCutoff ?? "—"}
            </p>
            <pre className="my-2 overflow-x-auto rounded-md bg-surface-muted p-3 text-xs">{m.metricsJson}</pre>
            {m.shadow && (
              <p className="text-sm">
                {t("admin.shadow")}: n={m.shadow.pairedEvaluations} · MAE {formatDecimal(m.shadow.candidateMae, locale)} vs {formatDecimal(m.shadow.activeMae, locale)} ·{" "}
                {m.shadow.relativeImprovement ? formatRatioPercent(m.shadow.relativeImprovement, locale) : "—"}
                {m.shadow.blockingReason && <span className="ml-2 text-warning">{m.shadow.blockingReason}</span>}
              </p>
            )}
            {(m.status === "Shadow" || m.status === "Retired") && (
              <div className="mt-2">
                <DecisionForm
                  busy={act.isPending}
                  actions={[
                    { key: "promote", label: t("admin.promote") },
                    ...(m.status === "Shadow" ? [{ key: "reject", label: t("admin.reject"), variant: "danger" as const }] : []),
                  ]}
                  onSubmit={(reason, _e, action) => act.mutate({ id: m.id!, action: action as "promote" | "reject", reason })}
                />
              </div>
            )}
          </Card>
        ))}
      </StepUpGate>
      {act.error && <ErrorState error={act.error} />}
    </div>
  );
}
