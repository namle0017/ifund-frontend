"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorState } from "@/components/data";
import { Button, Card, Checkbox, DataTable, Field, SelectInput, TextInput } from "@/components/ui";
import { api, call, type S } from "@/lib/api/client";
import { formatDateTime, formatNav, formatRatioPercent, parseAmountInput, percentToRatio } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

const KINDS: S<"AlertKind">[] = ["NavAbove", "NavBelow", "NavChangePercent", "NewOfficialNav", "ForecastDeviation"];
const isPercent = (k: S<"AlertKind">) => k === "NavChangePercent" || k === "ForecastDeviation";

/** SF-22 — alert rules evaluated only on verified data; deduplicated history (FL-09). */
export default function AlertsPage() {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const funds = useQuery({ queryKey: ["funds-all"], queryFn: () => call(() => api.GET("/v1/funds", { params: { query: { limit: 100 } } })) });
  const rules = useQuery({ queryKey: ["alerts"], queryFn: () => call(() => api.GET("/v1/alerts")) });
  const notes = useQuery({ queryKey: ["notifications"], queryFn: () => call(() => api.GET("/v1/notifications")) });
  const [fundId, setFundId] = useState("");
  const [kind, setKind] = useState<S<"AlertKind">>("NewOfficialNav");
  const [threshold, setThreshold] = useState("");
  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(false);
  const refresh = () => qc.invalidateQueries({ queryKey: ["alerts"] });

  const create = useMutation({
    mutationFn: () => {
      const value = kind === "NewOfficialNav" ? null : isPercent(kind) ? percentToRatio(threshold) : parseAmountInput(threshold, locale);
      return call(() => api.POST("/v1/alerts", { body: { fundId, kind, threshold: value, viaInApp: inApp, viaEmail: email, isEnabled: true } }));
    },
    onSuccess: () => {
      setThreshold("");
      void refresh();
    },
  });
  const remove = useMutation({ mutationFn: (id: string) => call(() => api.DELETE("/v1/alerts/{id}", { params: { path: { id } } })), onSuccess: refresh });
  const read = useMutation({
    mutationFn: (id: string) => call(() => api.POST("/v1/notifications/{id}/read", { params: { path: { id } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{t("alerts.title")}</h1>
      <Card>
        <form
          className="grid gap-3 md:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Field label={t("calc.fund")}>
            {(id) => (
              <SelectInput id={id} required value={fundId} onChange={(e) => setFundId(e.target.value)}>
                <option value="">—</option>
                {(funds.data?.items ?? []).map((f) => (
                  <option key={f.id} value={f.id!}>
                    {f.code}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t("alerts.kind")}>
            {(id) => (
              <SelectInput id={id} value={kind} onChange={(e) => setKind(e.target.value as S<"AlertKind">)}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`alerts.${k}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          {kind !== "NewOfficialNav" && (
            <Field label={`${t("alerts.threshold")}${isPercent(kind) ? " (%)" : ""}`}>
              {(id) => <TextInput id={id} required inputMode="decimal" value={threshold} onChange={(e) => setThreshold(e.target.value)} />}
            </Field>
          )}
          <div className="flex gap-4 md:col-span-3">
            <Checkbox label={t("alerts.inApp")} checked={inApp} onChange={(e) => setInApp(e.target.checked)} />
            <Checkbox label={t("alerts.email")} checked={email} onChange={(e) => setEmail(e.target.checked)} />
          </div>
          <Button type="submit" busy={create.isPending} className="md:col-span-3">
            {t("common.create")}
          </Button>
        </form>
        {create.error && <ErrorState error={create.error} />}
        <DataTable
          caption={t("alerts.title")}
          emptyLabel={t("common.empty")}
          headers={[t("funds.code"), t("alerts.kind"), t("alerts.threshold"), t("alerts.inApp"), t("alerts.email"), ""]}
          rows={(rules.data ?? []).map((r) => [
            r.fundCode,
            t(`alerts.${r.kind}`),
            r.threshold == null ? "—" : isPercent(r.kind!) ? formatRatioPercent(r.threshold, locale) : formatNav(r.threshold, locale),
            r.viaInApp ? "✓" : "",
            r.viaEmail ? "✓" : "",
            <Button key="d" variant="ghost" onClick={() => remove.mutate(r.id!)}>
              {t("common.delete")}
            </Button>,
          ])}
        />
      </Card>
      <Card title={t("alerts.history")}>
        <ul className="flex flex-col divide-y divide-border">
          {(notes.data ?? []).map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className={n.readAt ? "text-text-muted" : "font-semibold"}>
                {t(n.messageKey!, n.kind!)} · {formatDateTime(n.createdAt, locale)}
              </span>
              {!n.readAt && (
                <Button variant="ghost" onClick={() => read.mutate(n.id!)}>
                  {t("alerts.markRead")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
