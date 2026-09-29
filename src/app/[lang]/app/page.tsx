"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { ErrorState } from "@/components/data";
import { PortfolioSummaryView } from "@/components/portfolio-summary";
import { Button, Card, Field, Loading, TextInput } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

/** SF-14 — aggregate dashboard and portfolio list (FR-PORT-001, FR-AUTH-004). */
export default function DashboardPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const portfolios = useQuery({ queryKey: ["portfolios"], queryFn: () => call(() => api.GET("/v1/portfolios")) });
  const summary = useQuery({ queryKey: ["summary", "all"], queryFn: () => call(() => api.GET("/v1/portfolios/summary")) });
  const create = useMutation({
    mutationFn: () => call(() => api.POST("/v1/portfolios", { body: { name } })),
    onSuccess: () => {
      setName("");
      void qc.invalidateQueries({ queryKey: ["portfolios"] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("portfolio.dashboard")}</h1>
      <Card title={t("portfolio.all")}>
        {summary.isPending ? <Loading label={t("common.loading")} /> : summary.error ? <ErrorState error={summary.error} /> : <PortfolioSummaryView summary={summary.data} />}
      </Card>
      <Card title={t("nav.portfolios")}>
        {portfolios.error && <ErrorState error={portfolios.error} />}
        <ul className="flex flex-col divide-y divide-border">
          {(portfolios.data ?? []).map((p) => (
            <li key={p.id} className="flex items-center justify-between py-2">
              <Link href={`/${locale}/app/portfolios/${p.id}`} className="text-primary">
                {p.name}
              </Link>
              {p.archivedAt && <span className="text-xs text-text-muted">{t("portfolio.archive")}</span>}
            </li>
          ))}
        </ul>
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Field label={t("portfolio.name")}>{(id) => <TextInput id={id} required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Button type="submit" busy={create.isPending}>
            {t("portfolio.create")}
          </Button>
        </form>
        {create.error && <ErrorState error={create.error} />}
      </Card>
    </div>
  );
}
