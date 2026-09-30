"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState } from "@/components/data";
import { Alert, Button, Card, Checkbox, DataTable, Field, TextInput } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { useMe } from "@/lib/session";

type SessionRow = { id: string; createdAt: string; lastSeenAt: string; expiresAt?: string | null; current: boolean };

/** SF-24 — profile, sessions, password, Google link, export-before-delete (FR-AUTH-007, NAV-14). */
export default function SettingsPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmExport, setConfirmExport] = useState(false);
  const [confirmIrreversible, setConfirmIrreversible] = useState(false);
  // Response schema not yet declared in the OpenAPI artifact (BE follow-up: .Produces<SessionDto[]>).
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: async () => (await call(() => api.GET("/v1/auth/sessions"))) as unknown as SessionRow[] });
  const requests = useQuery({
    queryKey: ["data-requests"],
    queryFn: () => call(() => api.GET("/v1/me/data-requests")),
    refetchInterval: (q) => ((q.state.data ?? []).some((r) => r.status === "Requested" || r.status === "Processing") ? 3000 : false),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => call(() => api.DELETE("/v1/auth/sessions/{id}", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions"] }),
  });
  const changePassword = useMutation({ mutationFn: () => call(() => api.POST("/v1/auth/change-password", { body: { currentPassword: current, newPassword: next } })) });
  const exportData = useMutation({ mutationFn: () => call(() => api.POST("/v1/me/data-export")), onSuccess: () => qc.invalidateQueries({ queryKey: ["data-requests"] }) });
  const requestDeletion = useMutation({
    mutationFn: () => call(() => api.POST("/v1/me/deletion-request", { body: { confirmExportedOrDeclined: confirmExport, confirmIrreversible } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-requests"] }),
  });
  const cancelDeletion = useMutation({
    mutationFn: (id: string) => call(() => api.DELETE("/v1/me/deletion-request/{id}", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["data-requests"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">{t("settings.title")}</h1>
      <Card title={t("settings.profile")}>
        <p>{me?.email}</p>
        <p className="text-sm text-text-muted">{me?.roles.join(", ")}</p>
        {!me?.googleLinked && (
          <a href={`/api/v1/auth/google/start?link=true&returnUrl=${encodeURIComponent(`/${locale}/app/settings`)}`} className="mt-2 inline-block text-sm text-primary underline">
            {t("settings.linkGoogle")}
          </a>
        )}
      </Card>
      {me?.hasPassword && (
        <Card title={t("settings.changePassword")}>
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              changePassword.mutate();
            }}
          >
            <Field label={t("settings.currentPassword")}>{(id) => <TextInput id={id} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />}</Field>
            <Field label={t("auth.newPassword")} hint={t("auth.passwordRules")}>
              {(id, d) => <TextInput id={id} aria-describedby={d} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />}
            </Field>
            <Button type="submit" busy={changePassword.isPending} className="self-end">
              {t("common.save")}
            </Button>
          </form>
          {changePassword.error && <ErrorState error={changePassword.error} />}
          {changePassword.isSuccess && <Alert tone="success">OK</Alert>}
        </Card>
      )}
      <Card title={t("settings.sessions")}>
        <DataTable
          caption={t("settings.sessions")}
          headers={[t("common.date"), t("common.asOf"), ""]}
          rows={(sessions.data ?? []).map((s) => [
            formatDateTime(s.createdAt, locale),
            formatDateTime(s.lastSeenAt, locale),
            s.current ? "✓" : (
              <Button key="r" variant="ghost" onClick={() => revoke.mutate(s.id)}>
                {t("settings.revoke")}
              </Button>
            ),
          ])}
        />
      </Card>
      <Card title={t("settings.exportData")}>
        <Button variant="secondary" busy={exportData.isPending} onClick={() => exportData.mutate()}>
          {t("settings.exportData")}
        </Button>
        <DataTable
          caption={t("admin.dataRequests")}
          emptyLabel={t("common.empty")}
          headers={[t("common.date"), t("common.status"), ""]}
          rows={(requests.data ?? []).map((r) => [
            `${formatDateTime(r.requestedAt, locale)} · ${r.kind}`,
            `${r.status}${r.graceUntil ? ` · ${t("settings.graceUntil")} ${formatDateTime(r.graceUntil, locale)}` : ""}`,
            r.kind === "Export" && r.exportFileId ? (
              <a key="d" href={`/api/v1/files/${r.exportFileId}`} className="text-primary underline">
                {t("common.download")}
              </a>
            ) : r.kind === "Deletion" && r.status === "InGracePeriod" ? (
              <Button key="c" variant="ghost" onClick={() => cancelDeletion.mutate(r.id!)}>
                {t("common.cancel")}
              </Button>
            ) : (
              ""
            ),
          ])}
        />
      </Card>
      <Card title={t("settings.deleteAccount")}>
        <Alert tone="warning">{t("disclaimer.pendingLegal")}</Alert>
        <div className="mt-2 flex flex-col gap-2">
          <Checkbox label={t("settings.deleteConfirmExport")} checked={confirmExport} onChange={(e) => setConfirmExport(e.target.checked)} />
          <Checkbox label={t("settings.deleteConfirmIrreversible")} checked={confirmIrreversible} onChange={(e) => setConfirmIrreversible(e.target.checked)} />
          <Button variant="danger" className="self-start" disabled={!confirmExport || !confirmIrreversible} busy={requestDeletion.isPending} onClick={() => requestDeletion.mutate()}>
            {t("settings.deleteAccount")}
          </Button>
          {requestDeletion.error && <ErrorState error={requestDeletion.error} />}
        </div>
      </Card>
    </div>
  );
}
