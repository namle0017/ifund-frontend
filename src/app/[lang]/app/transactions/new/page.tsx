"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ErrorState } from "@/components/data";
import { DateInput } from "@/components/date-input";
import { Alert, Button, Card, Checkbox, Field, SelectInput, TextInput } from "@/components/ui";
import { api, call, type S } from "@/lib/api/client";
import { parseAmountInput } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

type Form = {
  portfolioId: string;
  fundId: string;
  side: "Buy" | "Sell";
  tradeDate: string;
  dateMode: S<"DateMode">;
  price: string;
  units: string;
  grossAmount: string;
  fees: string;
  taxes: string;
  netAmount: string;
  externalReference: string;
  notes: string;
};

function NewTransactionInner() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const snapshotId = sp.get("snapshotId");
  // One key per form instance: a double submit or retry never creates a second transaction (NFR-REL-001).
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [timelineConfirmed, setTimelineConfirmed] = useState(false);
  const [form, setForm] = useState<Form>({
    portfolioId: sp.get("portfolioId") ?? "",
    fundId: sp.get("fundId") ?? "",
    side: "Buy",
    tradeDate: new Date().toISOString().slice(0, 10),
    dateMode: "DealingOrExecution",
    price: "",
    units: "",
    grossAmount: "",
    fees: "",
    taxes: "",
    netAmount: "",
    externalReference: "",
    notes: "",
  });
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const portfolios = useQuery({ queryKey: ["portfolios"], queryFn: () => call(() => api.GET("/v1/portfolios")) });
  const funds = useQuery({ queryKey: ["funds-all"], queryFn: () => call(() => api.GET("/v1/funds", { params: { query: { limit: 100 } } })) });
  const snapshot = useQuery({
    queryKey: ["snapshot", snapshotId],
    enabled: !!snapshotId,
    queryFn: () => call(() => api.GET("/v1/calculations/{id}", { params: { path: { id: snapshotId! } } })),
  });

  useEffect(() => {
    const raw = (snapshot.data as { resultJson?: string } | undefined)?.resultJson;
    if (!raw) {
      return;
    }

    // Prefill from the saved estimate; the investor must still enter the actual executed values from their statement.
    const { result } = JSON.parse(raw) as { result: S<"CalculationResult"> };
    const sell = result.mechanism === "OpenFundRedemption" || result.mechanism === "ExchangeSell";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time prefill from a loaded snapshot
    setForm((f) => ({
      ...f,
      side: sell ? "Sell" : "Buy",
      price: result.calculationPrice ?? "",
      units: result.units ?? "",
      grossAmount: result.grossAmount ?? "",
      fees: result.totalFees ?? "",
      taxes: result.totalTaxes ?? "",
      netAmount: result.netAmount ?? "",
      tradeDate: result.timeline?.dealingDay ?? f.tradeDate,
    }));
  }, [snapshot.data]);

  const create = useMutation({
    mutationFn: () => {
      const n = (v: string) => (v ? parseAmountInput(v, locale) ?? v : null);
      const body: S<"TransactionInput"> = {
        fundId: form.fundId,
        side: form.side,
        tradeDate: form.tradeDate,
        dateMode: form.dateMode,
        price: n(form.price),
        units: n(form.units)!,
        grossAmount: n(form.grossAmount),
        fees: n(form.fees),
        taxes: n(form.taxes),
        netAmount: n(form.netAmount),
        externalReference: form.externalReference || null,
        notes: form.notes || null,
        calculationSnapshotId: snapshotId,
        timelineConfirmed,
      } as S<"TransactionInput">;
      return call(() =>
        api.POST("/v1/portfolios/{id}/transactions", { params: { path: { id: form.portfolioId }, header: { "Idempotency-Key": idempotencyKey } }, body }),
      );
    },
    onSuccess: (tx) => router.push(`/${locale}/app/transactions/${tx.id}`),
  });

  const input = (key: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <Field label={label}>{(id) => <TextInput id={id} value={form[key]} onChange={(e) => set(key, e.target.value as never)} inputMode="decimal" {...props} />}</Field>
  );

  return (
    <Card title={t("portfolio.newTransaction")} className="mx-auto w-full max-w-3xl">
      <Alert tone="info">{t("tx.completeWarning")}</Alert>
      <form
        className="mt-3 grid gap-3 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Field label={t("nav.portfolios")}>
          {(id) => (
            <SelectInput id={id} required value={form.portfolioId} onChange={(e) => set("portfolioId", e.target.value)}>
              <option value="">—</option>
              {(portfolios.data ?? []).filter((p) => !p.archivedAt).map((p) => (
                <option key={p.id} value={p.id!}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("calc.fund")}>
          {(id) => (
            <SelectInput id={id} required value={form.fundId} onChange={(e) => set("fundId", e.target.value)}>
              <option value="">—</option>
              {(funds.data?.items ?? []).map((f) => (
                <option key={f.id} value={f.id!}>
                  {f.code} · {t(`fundType.${f.type}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("tx.side")}>
          {(id) => (
            <SelectInput id={id} value={form.side} onChange={(e) => set("side", e.target.value as Form["side"])}>
              <option value="Buy">{t("tx.buy")}</option>
              <option value="Sell">{t("tx.sell")}</option>
            </SelectInput>
          )}
        </Field>
        <Field label={t("labels.tradeDate")}>{(id, d) => <DateInput id={id} aria-describedby={d} required value={form.tradeDate} onChange={(v) => set("tradeDate", v)} />}</Field>
        <Field label={t("calc.dateMode")}>
          {(id) => (
            <SelectInput id={id} value={form.dateMode} onChange={(e) => set("dateMode", e.target.value as S<"DateMode">)}>
              <option value="DealingOrExecution">{t("calc.execution")}</option>
              <option value="Placement">{t("calc.placement")}</option>
            </SelectInput>
          )}
        </Field>
        {input("price", t("tx.price"))}
        {input("units", t("calc.units"), { required: true })}
        {input("grossAmount", t("tx.gross"))}
        {input("fees", t("tx.fees"))}
        {input("taxes", t("tx.taxes"))}
        {input("netAmount", t("tx.net"))}
        {input("externalReference", t("tx.externalRef"), { inputMode: "text" })}
        {input("notes", t("tx.notes"), { inputMode: "text" })}
        {snapshotId && (
          <div className="md:col-span-2">
            <Checkbox label={t("calc.confirmTimeline")} checked={timelineConfirmed} onChange={(e) => setTimelineConfirmed(e.target.checked)} />
          </div>
        )}
        {create.error && (
          <div className="md:col-span-2">
            <ErrorState error={create.error} />
          </div>
        )}
        <Button type="submit" busy={create.isPending} className="md:col-span-2">
          {t("common.save")}
        </Button>
      </form>
    </Card>
  );
}

/** SF-16 — planned transaction from scratch or from a saved calculation. Never marks it completed. */
export default function NewTransactionPage() {
  return (
    <Suspense>
      <NewTransactionInner />
    </Suspense>
  );
}
