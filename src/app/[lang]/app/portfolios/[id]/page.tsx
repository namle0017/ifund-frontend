"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useState } from "react";
import { ErrorState } from "@/components/data";
import { PortfolioSummaryView } from "@/components/portfolio-summary";
import { ReconStatusBadge, UserStatusBadge } from "@/components/status-badges";
import { Button, Card, DataTable, Loading, TextInput } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { formatDate, formatDecimal, formatUnits, formatVnd } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/** SF-15 — holdings (FIFO lots), transactions with declared/reconciliation status, rename/archive. */
export default function PortfolioPage({ params }: PageProps<"/[lang]/app/portfolios/[id]">) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const portfolios = useQuery({ queryKey: ["portfolios"], queryFn: () => call(() => api.GET("/v1/portfolios")) });
  const summary = useQuery({ queryKey: ["summary", id], queryFn: () => call(() => api.GET("/v1/portfolios/{id}/summary", { params: { path: { id } } })) });
  const txs = useQuery({ queryKey: ["transactions", id], queryFn: () => call(() => api.GET("/v1/portfolios/{id}/transactions", { params: { path: { id } } })) });
  const portfolio = portfolios.data?.find((p) => p.id === id);
  const [name, setName] = useState<string | null>(null);
  const update = useMutation({
    mutationFn: (body: { name?: string | null; archived?: boolean | null }) =>
      call(() => api.PATCH("/v1/portfolios/{id}", { params: { path: { id } }, body: { name: body.name ?? null, archived: body.archived ?? null, concurrencyStamp: portfolio!.concurrencyStamp! } })),
    onSuccess: () => {
      setName(null);
      void qc.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {name === null ? (
          <h1 className="display-lg">{portfolio?.name ?? "…"}</h1>
        ) : (
          <TextInput aria-label={t("portfolio.name")} value={name} onChange={(e) => setName(e.target.value)} />
        )}
        {portfolio && (name === null ? (
          <Button variant="ghost" onClick={() => setName(portfolio.name ?? "")}>
            {t("portfolio.rename")}
          </Button>
        ) : (
          <Button busy={update.isPending} onClick={() => update.mutate({ name })}>
            {t("common.save")}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Link href={`/${locale}/app/transactions/new?portfolioId=${id}`} className="btn btn-primary">
            {t("portfolio.newTransaction")}
          </Link>
          <Link href={`/${locale}/app/transactions/import?portfolioId=${id}`} className="btn btn-secondary">
            {t("portfolio.import")}
          </Link>
        </div>
      </div>
      {update.error && <ErrorState error={update.error} />}

      <Card title={t("portfolio.holdings")}>
        {summary.isPending ? <Loading label={t("common.loading")} /> : summary.error ? <ErrorState error={summary.error} /> : <PortfolioSummaryView summary={summary.data} />}
        {summary.data?.holdings?.map((h) =>
          h.lots?.length ? (
            <details key={h.classId} className="mt-2 text-sm">
              <summary>
                {t("portfolio.lots")} — {h.fundCode}
              </summary>
              <DataTable
                caption={t("portfolio.lots")}
                headers={[t("labels.tradeDate"), t("calc.units"), t("calc.units"), t("portfolio.totalCost")]}
                rows={h.lots.map((l) => [formatDate(l.acquiredOn, locale), formatUnits(l.originalUnits, locale), formatUnits(l.remainingUnits, locale), formatVnd(l.remainingCost, locale)])}
              />
            </details>
          ) : null,
        )}
      </Card>

      <Card title={t("portfolio.transactions")}>
        {txs.isPending ? (
          <Loading label={t("common.loading")} />
        ) : txs.error ? (
          <ErrorState error={txs.error} />
        ) : (
          <DataTable
            caption={t("portfolio.transactions")}
            emptyLabel={t("common.empty")}
            headers={[t("labels.tradeDate"), t("funds.code"), t("tx.side"), t("calc.units"), t("tx.price"), t("tx.net"), t("common.status"), t("tx.reconciliation"), ""]}
            rows={(txs.data ?? []).map((x) => [
              formatDate(x.tradeDate, locale),
              x.fundCode,
              t(`mechanism.${x.mechanism}`),
              formatUnits(x.units, locale),
              formatDecimal(x.price, locale),
              formatVnd(x.netAmount, locale),
              <span key="s" className="flex flex-col gap-1">
                <UserStatusBadge status={x.userStatus!} />
                {x.isProvisional && <span className="text-xs text-warning">{t("tx.provisional")}</span>}
              </span>,
              <ReconStatusBadge key="r" status={x.reconciliationStatus!} />,
              <Link key="l" href={`/${locale}/app/transactions/${x.id}`} className="text-primary">
                {t("common.details")}
              </Link>,
            ])}
          />
        )}
      </Card>
      {portfolio && !portfolio.archivedAt && (
        <Button variant="secondary" className="self-start" onClick={() => update.mutate({ archived: true })}>
          {t("portfolio.archive")}
        </Button>
      )}
    </div>
  );
}
