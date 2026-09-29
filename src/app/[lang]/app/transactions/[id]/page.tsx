"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";
import { ErrorState } from "@/components/data";
import { ReconStatusBadge, UserStatusBadge } from "@/components/status-badges";
import { Alert, Button, Card, DataTable, Loading } from "@/components/ui";
import { api, call, type S } from "@/lib/api/client";
import { formatDate, formatDecimal, formatUnits, formatVnd } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/**
 * SF-17 — per-field reconciliation (expected vs declared, tolerance, outcome), user status declarations and the path
 * to completion. Admin cases are visible but the investor can only edit their own record (FR-REC-004).
 */
export default function TransactionPage({ params }: PageProps<"/[lang]/app/transactions/[id]">) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const tx = useQuery({ queryKey: ["tx", id], queryFn: () => call(() => api.GET("/v1/transactions/{id}", { params: { path: { id } } })) });
  const recon = useQuery({ queryKey: ["recon", id], queryFn: () => call(() => api.GET("/v1/transactions/{id}/reconciliation", { params: { path: { id } } })) });
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: ["tx", id] }), qc.invalidateQueries({ queryKey: ["recon", id] })]);
  const rerun = useMutation({ mutationFn: () => call(() => api.POST("/v1/transactions/{id}/reconciliation/rerun", { params: { path: { id } } })), onSuccess: refresh });
  const declare = useMutation({
    mutationFn: (status: S<"UserStatus">) =>
      call(() => api.POST("/v1/transactions/{id}/status", { params: { path: { id } }, body: { status, concurrencyStamp: tx.data!.concurrencyStamp! } })),
    onSuccess: refresh,
  });

  if (tx.isPending) {
    return <Loading label={t("common.loading")} />;
  }

  if (tx.error) {
    return <ErrorState error={tx.error} />;
  }

  const x = tx.data;
  const terminal = x.userStatus === "Completed" || x.userStatus === "Canceled" || x.userStatus === "Failed";
  const next: S<"UserStatus">[] = x.userStatus === "Planned" ? ["Submitted", "Canceled", "Failed"] : x.userStatus === "Submitted" ? ["Confirmed", "Canceled", "Failed"] : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">
          {x.fundCode} · {t(`mechanism.${x.mechanism}`)}
        </h1>
        <UserStatusBadge status={x.userStatus!} />
        <ReconStatusBadge status={x.reconciliationStatus!} />
      </div>
      <Card>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {(
            [
              [t("labels.tradeDate"), formatDate(x.tradeDate, locale)],
              [t("tx.price"), formatDecimal(x.price, locale)],
              [t("calc.units"), formatUnits(x.units, locale)],
              [t("tx.gross"), formatVnd(x.grossAmount, locale)],
              [t("tx.fees"), formatVnd(x.fees, locale)],
              [t("tx.taxes"), formatVnd(x.taxes, locale)],
              [t("tx.net"), formatVnd(x.netAmount, locale)],
              [t("tx.externalRef"), x.externalReference ?? "—"],
              [t("tx.origin"), x.origin],
            ] as const
          ).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[10rem_1fr]">
              <dt className="text-text-muted">{k}</dt>
              <dd className="num">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title={t("tx.reconciliation")} actions={!terminal && <Button variant="secondary" busy={rerun.isPending} onClick={() => rerun.mutate()}>{t("tx.rerun")}</Button>}>
        {recon.data && (
          <>
            <p className="mb-2 text-xs text-text-muted">
              {t("recon.policy")}: {recon.data.policyVersion ?? "—"}
              {recon.data.lastDecision && ` · ${t("recon.adminDecision")}: ${recon.data.lastDecision} (${recon.data.lastDecisionReason ?? ""})`}
            </p>
            <DataTable
              caption={t("tx.reconciliation")}
              headers={[t("recon.field"), t("recon.expected"), t("recon.observed"), t("recon.difference"), t("recon.tolerance"), t("recon.outcome")]}
              rows={(recon.data.findings ?? []).map((f) => [
                f.field,
                formatDecimal(f.expected, locale),
                formatDecimal(f.observed, locale),
                formatDecimal(f.difference, locale),
                formatDecimal(f.tolerance, locale),
                <span key="o" className={f.outcome === "Mismatch" ? "font-semibold text-danger" : f.outcome === "NotComparable" ? "text-warning" : ""}>
                  {t(`recon.${f.outcome}`)}
                  {f.reason ? ` (${f.reason})` : ""}
                </span>,
              ])}
            />
          </>
        )}
      </Card>

      {!terminal && (
        <Card>
          {next.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-sm">{t("tx.declare")}:</span>
              {next.map((s) => (
                <Button key={s} variant="secondary" busy={declare.isPending && declare.variables === s} onClick={() => declare.mutate(s)}>
                  {t(`userStatus.${s}`)}
                </Button>
              ))}
            </div>
          )}
          {declare.error && <ErrorState error={declare.error} />}
          {(x.completionBlockers ?? []).length > 0 ? (
            <Alert tone="warning" title={t("tx.blockers")}>
              <ul className="list-disc pl-5">
                {(x.completionBlockers ?? []).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </Alert>
          ) : (
            <Link href={`/${locale}/app/transactions/${id}/complete`} className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast">
              {t("tx.complete")}
            </Link>
          )}
        </Card>
      )}
      <Link href={`/${locale}/app/portfolios/${x.portfolioId}`} className="text-sm text-primary">
        ← {t("common.back")}
      </Link>
    </div>
  );
}
