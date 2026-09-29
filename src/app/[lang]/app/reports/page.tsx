"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState } from "@/components/data";
import { Alert, Button, Card, DataTable, Field, SelectInput, TextInput } from "@/components/ui";
import { api, call, type S } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/** SF-23 — async report jobs; CSV/XLSX from the BE, PDF rendered in the browser from the BE snapshot (ADR-005). */
export default function ReportsPage() {
  const { t, locale, dict } = useI18n();
  const qc = useQueryClient();
  const [format, setFormat] = useState<S<"ReportFormat">>("PdfSnapshot");
  const [portfolioId, setPortfolioId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const portfolios = useQuery({ queryKey: ["portfolios"], queryFn: () => call(() => api.GET("/v1/portfolios")) });
  const jobs = useQuery({
    queryKey: ["reports"],
    queryFn: () => call(() => api.GET("/v1/reports")),
    // Poll safely while jobs are processing (04 §9 "Processing").
    refetchInterval: (q) => ((q.state.data ?? []).some((j) => j.status === "Queued" || j.status === "Running") ? 3000 : false),
  });
  const create = useMutation({
    mutationFn: () => call(() => api.POST("/v1/reports", { body: { format, portfolioId: portfolioId || null, from: from || null, to: to || null } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
  const pdf = useMutation({
    mutationFn: async (id: string) => {
      const snapshot = await call(() => api.GET("/v1/reports/{id}/snapshot", { params: { path: { id } } }));
      const [{ pdf: render }, { ReportPdf }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/report-pdf")]);
      const blob = await render(<ReportPdf snapshot={snapshot} locale={locale} dict={dict} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ifund-report-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
      <Alert tone="info">{t("reports.notStatement")}</Alert>
      <Card>
        <form
          className="grid gap-3 md:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Field label={t("reports.format")}>
            {(id) => (
              <SelectInput id={id} value={format} onChange={(e) => setFormat(e.target.value as S<"ReportFormat">)}>
                <option value="PdfSnapshot">PDF</option>
                <option value="Csv">CSV</option>
                <option value="Xlsx">Excel</option>
              </SelectInput>
            )}
          </Field>
          <Field label={t("nav.portfolios")}>
            {(id) => (
              <SelectInput id={id} value={portfolioId} onChange={(e) => setPortfolioId(e.target.value)}>
                <option value="">{t("portfolio.all")}</option>
                {(portfolios.data ?? []).map((p) => (
                  <option key={p.id} value={p.id!}>
                    {p.name}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t("reports.from")}>{(id) => <TextInput id={id} type="date" value={from} onChange={(e) => setFrom(e.target.value)} />}</Field>
          <Field label={t("reports.to")}>{(id) => <TextInput id={id} type="date" value={to} onChange={(e) => setTo(e.target.value)} />}</Field>
          <Button type="submit" busy={create.isPending} className="md:col-span-4">
            {t("reports.generate")}
          </Button>
        </form>
        {create.error && <ErrorState error={create.error} />}
      </Card>
      <Card>
        <DataTable
          caption={t("reports.title")}
          emptyLabel={t("common.empty")}
          headers={[t("common.date"), t("reports.format"), t("common.status"), ""]}
          rows={(jobs.data ?? []).map((j) => [
            formatDateTime(j.createdAt, locale),
            j.format,
            j.status === "Queued" || j.status === "Running" ? t("reports.processing") : `${j.status}${j.error ? ` (${j.error})` : ""}`,
            j.downloadable ? (
              j.format === "PdfSnapshot" ? (
                <Button key="p" variant="ghost" busy={pdf.isPending && pdf.variables === j.id} onClick={() => pdf.mutate(j.id!)}>
                  {t("reports.pdf")}
                </Button>
              ) : (
                <a key="d" href={`/api/v1/reports/${j.id}/download`} className="text-primary underline">
                  {t("common.download")}
                </a>
              )
            ) : (
              "—"
            ),
          ])}
        />
        {pdf.error && <ErrorState error={pdf.error} />}
      </Card>
    </div>
  );
}
