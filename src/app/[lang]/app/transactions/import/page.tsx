"use client";

import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ErrorState } from "@/components/data";
import { Alert, Button, Card, DataTable } from "@/components/ui";
import { api, call, uploadFile, type S } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

function ImportInner() {
  const { t, locale } = useI18n();
  const portfolioId = useSearchParams().get("portfolioId") ?? "";
  const [file, setFile] = useState<S<"FileDto"> | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const upload = useMutation({ mutationFn: (f: File) => uploadFile(f, "TransactionImport"), onSuccess: setFile });
  const preview = useMutation({
    mutationFn: () => call(() => api.POST("/v1/portfolios/{id}/imports", { params: { path: { id: portfolioId } }, body: { fileId: file!.id!, mapping: null } })),
    onSuccess: (p) => setSelected(new Set((p.rows ?? []).filter((r) => (r.errors ?? []).length === 0 && !r.possibleDuplicate).map((r) => Number(r.row)))),
  });
  const commit = useMutation({ mutationFn: () => call(() => api.POST("/v1/imports/{id}/commit", { params: { path: { id: preview.data!.importJobId! } }, body: { rows: [...selected] } })) });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">{t("import.title")}</h1>
      <Card>
        <p className="text-sm text-text-muted">{t("import.template")}</p>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          {t("import.upload")} (.csv, .xlsx ≤ 5 MB)
          <input type="file" accept=".csv,.xlsx" onChange={(e) => e.target.files?.[0] && upload.mutate(e.target.files[0])} />
        </label>
        {upload.isPending && <p role="status">{t("import.scanning")}</p>}
        {upload.error && <ErrorState error={upload.error} />}
        {file?.scanStatus === "Infected" && <Alert tone="danger">{t("import.infected")}</Alert>}
        {(file?.scanStatus === "ScanFailed" || file?.scanStatus === "PendingScan") && <Alert tone="warning">{t("import.scanFailed")}</Alert>}
        {file?.scanStatus === "Clean" && (
          <Button className="mt-3" busy={preview.isPending} onClick={() => preview.mutate()}>
            {t("import.preview")}
          </Button>
        )}
        {preview.error && <ErrorState error={preview.error} />}
      </Card>

      {preview.data && (
        <Card title={`${t("import.preview")} — ✓ ${preview.data.validCount} · ✗ ${preview.data.errorCount}`}>
          <DataTable
            caption={t("import.preview")}
            headers={["", t("import.row"), t("funds.code"), t("tx.side"), t("labels.tradeDate"), t("calc.units"), t("import.errors"), t("import.duplicate")]}
            rows={(preview.data.rows ?? []).map((r) => {
              const ok = (r.errors ?? []).length === 0;
              return [
                <input
                  key="c"
                  type="checkbox"
                  aria-label={`${t("import.row")} ${r.row}`}
                  disabled={!ok}
                  checked={selected.has(Number(r.row))}
                  onChange={(e) =>
                    setSelected((s) => {
                      const n = new Set(s);
                      if (e.target.checked) {
                        n.add(Number(r.row));
                      } else {
                        n.delete(Number(r.row));
                      }

                      return n;
                    })
                  }
                />,
                r.row,
                r.parsed?.fundId ? "✓" : "—",
                r.parsed?.side ?? "—",
                r.parsed?.tradeDate ?? "—",
                r.parsed?.units ?? "—",
                <span key="e" className="text-danger">
                  {(r.errors ?? []).join(", ")}
                </span>,
                r.possibleDuplicate ? <span key="d" className="text-warning">{r.duplicateReason}</span> : "",
              ];
            })}
          />
          <Button className="mt-3" disabled={selected.size === 0} busy={commit.isPending} onClick={() => commit.mutate()}>
            {t("import.importSelected")} ({selected.size})
          </Button>
          {commit.error && <ErrorState error={commit.error} />}
          {commit.data && (
            <Alert tone="success" live>
              {t("import.imported")} ({commit.data.imported}){" "}
              <Link href={`/${locale}/app/portfolios/${portfolioId}`} className="text-primary underline">
                {t("nav.portfolios")}
              </Link>
            </Alert>
          )}
        </Card>
      )}
    </div>
  );
}

/** SF-19 — upload (malware-scanned) → preview with errors/duplicates → import selected rows as PLANNED (FL-06). */
export default function ImportPage() {
  return (
    <Suspense>
      <ImportInner />
    </Suspense>
  );
}
