"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState } from "@/components/data";
import { Button, Card, DataTable } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { useMe } from "@/lib/session";

/** SF-A06 — read-only hash-chained audit log and personal-data requests (audit cannot be edited from the UI). */
export default function OperationsPage() {
  const { t, locale } = useI18n();
  const { data: me } = useMe();
  const [beforeId, setBeforeId] = useState<number | null>(null);
  const audit = useQuery({
    queryKey: ["audit", beforeId],
    queryFn: () => call(() => api.GET("/v1/admin/audit", { params: { query: { beforeId: beforeId ?? undefined } } })),
  });
  const requests = useQuery({
    queryKey: ["admin-data-requests"],
    enabled: !!me?.roles.includes("DataAdmin"),
    queryFn: () => call(() => api.GET("/v1/admin/data-requests")),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">{t("admin.operations")}</h1>
      <Card title={t("admin.audit")}>
        {audit.error && <ErrorState error={audit.error} />}
        <DataTable
          caption={t("admin.audit")}
          headers={["#", t("common.date"), "Action", "Entity", t("common.reason"), "Hash"]}
          rows={(audit.data ?? []).map((a) => [a.id, formatDateTime(a.occurredAt, locale), a.action, `${a.entityType} ${a.entityId?.slice(0, 8) ?? ""}`, a.reason ?? "", <code key="h">{a.hash?.slice(0, 12)}</code>])}
        />
        {(audit.data ?? []).length === 100 && (
          <Button variant="secondary" className="mt-2" onClick={() => setBeforeId(Number(audit.data![audit.data!.length - 1].id))}>
            {t("common.next")}
          </Button>
        )}
      </Card>
      {requests.data && (
        <Card title={t("admin.dataRequests")}>
          <DataTable
            caption={t("admin.dataRequests")}
            headers={[t("common.date"), "Kind", t("common.status"), "Legal"]}
            rows={requests.data.map((r) => [formatDateTime(r.requestedAt, locale), r.kind, r.status, r.legalStatus])}
          />
        </Card>
      )}
    </div>
  );
}
