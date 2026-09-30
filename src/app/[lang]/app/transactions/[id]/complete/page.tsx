"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { use, useState } from "react";
import { ErrorState } from "@/components/data";
import { Alert, Button, Card, Checkbox, Loading } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { formatDate, formatUnits, formatVnd } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/**
 * SF-18 — explicit completion. The button stays disabled until checks pass and the investor ticks the "not an order"
 * confirmation; the BE re-checks everything (race/duplicate safe) and updates holdings exactly once (NAV-07/08).
 */
export default function CompletePage({ params }: PageProps<"/[lang]/app/transactions/[id]/complete">) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const [ack, setAck] = useState(false);
  const tx = useQuery({ queryKey: ["tx", id], queryFn: () => call(() => api.GET("/v1/transactions/{id}", { params: { path: { id } } })) });
  const complete = useMutation({
    mutationFn: () => call(() => api.POST("/v1/transactions/{id}/confirm-completed", { params: { path: { id } }, body: { confirmNotAnOrder: true, concurrencyStamp: tx.data!.concurrencyStamp! } })),
    onSuccess: (data) => {
      qc.setQueryData(["tx", id], data);
      void qc.invalidateQueries({ queryKey: ["summary"] });
    },
  });

  if (tx.isPending) {
    return <Loading label={t("common.loading")} />;
  }

  if (tx.error) {
    return <ErrorState error={tx.error} />;
  }

  const x = tx.data;
  const blocked = (x.completionBlockers ?? []).length > 0;
  return (
    <Card title={t("tx.completeTitle")} className="mx-auto w-full max-w-2xl">
      {x.userStatus === "Completed" ? (
        <Alert tone="success" live>
          {t("tx.completed")}{" "}
          <Link href={`/${locale}/app/portfolios/${x.portfolioId}`} className="text-primary underline">
            {t("nav.portfolios")}
          </Link>
        </Alert>
      ) : (
        <div className="flex flex-col gap-3">
          <dl className="grid gap-1 text-sm">
            <div>
              {x.fundCode} · {t(`mechanism.${x.mechanism}`)} · {formatDate(x.tradeDate, locale)}
            </div>
            <div className="num">
              {formatUnits(x.units, locale)} × {x.price ?? "—"} → {formatVnd(x.netAmount, locale)}
            </div>
          </dl>
          <Alert tone="warning">{t("tx.completeWarning")}</Alert>
          {blocked && (
            <Alert tone="danger" title={t("tx.blockers")}>
              {(x.completionBlockers ?? []).join(", ")}
            </Alert>
          )}
          <Checkbox label={t("tx.confirmNotOrder")} checked={ack} onChange={(e) => setAck(e.target.checked)} />
          {complete.error && <ErrorState error={complete.error} />}
          <Button disabled={blocked || !ack} busy={complete.isPending} onClick={() => complete.mutate()}>
            {t("tx.complete")}
          </Button>
        </div>
      )}
    </Card>
  );
}
