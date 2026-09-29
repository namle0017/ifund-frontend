"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { CalculationResultView } from "@/components/calculation-result";
import { Disclaimer, ErrorState } from "@/components/data";
import { Alert, Button, Card, Checkbox, Field, SelectInput, TextInput } from "@/components/ui";
import { api, call, type S } from "@/lib/api/client";
import { parseAmountInput, percentToRatio } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { useMe } from "@/lib/session";

type Operation = "buy" | "sell" | "inverse" | "switch";

interface FormState {
  fundId: string;
  operation: Operation;
  amount: string;
  units: string;
  targetUnits: string;
  dateMode: S<"DateMode">;
  enteredAt: string;
  marketPrice: string;
  brokerPercent: string;
  assumedAcquisitionDate: string;
  targetFundId: string;
  useForecast: boolean;
  portfolioId: string;
}

/** B3: guests keep only calculator inputs in sessionStorage so the calculation can be re-run after sign-in. */
const DRAFT_KEY = "ifund.calculator.draft";

const emptyForm = (fundId = ""): FormState => ({
  fundId,
  operation: "buy",
  amount: "",
  units: "",
  targetUnits: "",
  dateMode: "Placement",
  enteredAt: "",
  marketPrice: "",
  brokerPercent: "",
  assumedAcquisitionDate: "",
  targetFundId: "",
  useForecast: false,
  portfolioId: "",
});

function CalculatorInner() {
  const { t, locale } = useI18n();
  const search = useSearchParams();
  const router = useRouter();
  const { data: me } = useMe();
  const [form, setForm] = useState<FormState>(() => emptyForm(search.get("fundId") ?? ""));
  const [confirmTimeline, setConfirmTimeline] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Restore the guest draft once on mount only; re-running it would overwrite what the user is typing.
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) {
      return;
    }

    restored.current = true;
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY);
      if (draft) {
        const saved = JSON.parse(draft) as FormState;
        const fromUrl = search.get("fundId");
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of browser-only draft state
        setForm((f) => ({ ...f, ...saved, ...(fromUrl && fromUrl !== saved.fundId ? { ...emptyForm(fromUrl) } : {}) }));
      }
    } catch {
      // ignore malformed drafts
    }
  }, [search]);

  const funds = useQuery({ queryKey: ["funds-all"], queryFn: () => call(() => api.GET("/v1/funds", { params: { query: { limit: 100 } } })) });
  const fund = useQuery({
    queryKey: ["fund", form.fundId],
    enabled: !!form.fundId,
    queryFn: () => call(() => api.GET("/v1/funds/{id}", { params: { path: { id: form.fundId } } })),
  });
  const portfolios = useQuery({ queryKey: ["portfolios"], enabled: !!me, queryFn: () => call(() => api.GET("/v1/portfolios")) });

  const isExchange = fund.data?.type === "Etf" || fund.data?.type === "ClosedFund";
  const operations = useMemo<Operation[]>(() => {
    if (!fund.data) {
      return [];
    }

    const mechanisms = fund.data.classes?.[0]?.supportedMechanisms ?? [];
    if (isExchange) {
      return [...(mechanisms.includes("ExchangeBuy") ? (["buy"] as const) : []), ...(mechanisms.includes("ExchangeSell") ? (["sell"] as const) : [])];
    }

    return [
      ...(mechanisms.includes("OpenFundSubscription") ? (["buy", "inverse"] as const) : []),
      ...(mechanisms.includes("OpenFundRedemption") ? (["sell"] as const) : []),
      ...(mechanisms.includes("OpenFundSwitch") ? (["switch"] as const) : []),
    ];
  }, [fund.data, isExchange]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const buildRequest = (save: boolean): S<"CalculationRequest"> | null => {
    const amount = form.amount ? parseAmountInput(form.amount, locale) : null;
    const units = form.units ? parseAmountInput(form.units, locale) : null;
    const targetUnits = form.targetUnits ? parseAmountInput(form.targetUnits, locale) : null;
    const marketPrice = form.marketPrice ? parseAmountInput(form.marketPrice, locale) : null;
    const broker = form.brokerPercent ? percentToRatio(form.brokerPercent) : null;
    if ((form.amount && !amount) || (form.units && !units) || (form.targetUnits && !targetUnits) || (form.marketPrice && !marketPrice) || (form.brokerPercent && !broker)) {
      setInputError(t("errors.VALIDATION_ERROR"));
      return null;
    }

    setInputError(null);
    return {
      fundId: form.fundId,
      amount: form.operation === "buy" ? amount : null,
      units: form.operation === "sell" || form.operation === "switch" || (form.operation === "buy" && !amount) ? units : null,
      targetUnits: form.operation === "inverse" ? targetUnits : null,
      dateMode: form.dateMode,
      enteredAt: form.enteredAt || null,
      navChoice: form.useForecast ? "LatestForecast" : "LatestVerified",
      marketPrice: isExchange ? marketPrice : null,
      brokerCommissionRate: isExchange ? broker : null,
      assumedAcquisitionDate: form.assumedAcquisitionDate || null,
      portfolioId: form.portfolioId || null,
      targetFundId: form.operation === "switch" ? form.targetFundId || null : null,
      save,
      timelineConfirmed: save ? confirmTimeline : false,
    } as S<"CalculationRequest">;
  };

  const calc = useMutation({
    mutationFn: async (save: boolean) => {
      const body = buildRequest(save);
      if (!body) {
        throw new Error("invalid-input");
      }

      const path = `/v1/calculations/${form.operation}` as "/v1/calculations/buy";
      return call(() => api.POST(path, { body }));
    },
    onSuccess: (data, save) => {
      if (save && data.snapshotId) {
        router.push(`/${locale}/app/transactions/new?snapshotId=${data.snapshotId}&fundId=${form.fundId}`);
      }
    },
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // storage unavailable
    }
  }, [form]);

  const result = calc.data?.result;
  const needsConfirm = result?.timeline?.requiresUserConfirmation;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">{t("calc.title")}</h1>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              calc.mutate(false);
            }}
          >
            <Field label={t("calc.fund")}>
              {(id) => (
                <SelectInput id={id} required value={form.fundId} onChange={(e) => setForm({ ...emptyForm(e.target.value), dateMode: form.dateMode })}>
                  <option value="">—</option>
                  {(funds.data?.items ?? []).map((f) => (
                    <option key={f.id} value={f.id!}>
                      {f.code} · {t(`fundType.${f.type}`)}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>
            {fund.data && (
              <>
                {isExchange && <Alert tone="info">{t("calc.exchangeNote")}</Alert>}
                <fieldset className="flex flex-wrap gap-2">
                  <legend className="mb-1 text-sm font-medium">{t("calc.operation")}</legend>
                  {operations.map((op) => (
                    <label key={op} className={`chip ${form.operation === op ? "border-primary bg-info-bg text-primary" : ""}`}>
                      <input type="radio" name="operation" value={op} checked={form.operation === op} onChange={() => set("operation", op)} className="sr-only" />
                      {t(`calc.${op}`)}
                    </label>
                  ))}
                  {!isExchange && !operations.includes("switch") && <p className="w-full text-xs text-text-muted">{t("calc.switchUnsupported")}</p>}
                </fieldset>

                {form.operation === "buy" && (
                  <Field label={isExchange ? `${t("calc.amount")} / ${t("calc.units")}` : t("calc.amount")}>
                    {(id, d) => <TextInput id={id} aria-describedby={d} inputMode="decimal" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="10.000.000" />}
                  </Field>
                )}
                {(form.operation === "sell" || form.operation === "switch" || (form.operation === "buy" && isExchange && !form.amount)) && (
                  <Field label={t("calc.units")}>
                    {(id) => <TextInput id={id} inputMode="decimal" value={form.units} onChange={(e) => set("units", e.target.value)} />}
                  </Field>
                )}
                {form.operation === "inverse" && (
                  <Field label={t("calc.targetUnits")}>
                    {(id) => <TextInput id={id} inputMode="decimal" value={form.targetUnits} onChange={(e) => set("targetUnits", e.target.value)} />}
                  </Field>
                )}
                {form.operation === "switch" && (
                  <Field label={t("calc.targetFund")}>
                    {(id) => (
                      <SelectInput id={id} value={form.targetFundId} onChange={(e) => set("targetFundId", e.target.value)}>
                        <option value="">—</option>
                        {(funds.data?.items ?? [])
                          .filter((f) => f.type === "OpenFund" && f.id !== form.fundId)
                          .map((f) => (
                            <option key={f.id} value={f.id!}>
                              {f.code}
                            </option>
                          ))}
                      </SelectInput>
                    )}
                  </Field>
                )}
                {isExchange && (
                  <>
                    <Field label={t("calc.marketPrice")}>{(id) => <TextInput id={id} inputMode="decimal" value={form.marketPrice} onChange={(e) => set("marketPrice", e.target.value)} />}</Field>
                    <Field label={t("calc.brokerRate")}>{(id) => <TextInput id={id} inputMode="decimal" value={form.brokerPercent} onChange={(e) => set("brokerPercent", e.target.value)} placeholder="0,15" />}</Field>
                  </>
                )}
                {!isExchange && (
                  <Field label={t("calc.dateMode")}>
                    {(id) => (
                      <SelectInput id={id} value={form.dateMode} onChange={(e) => set("dateMode", e.target.value as S<"DateMode">)}>
                        <option value="Placement">{t("calc.placement")}</option>
                        <option value="DealingOrExecution">{t("calc.execution")}</option>
                      </SelectInput>
                    )}
                  </Field>
                )}
                <Field label={t("calc.enteredAt")} hint="GMT+7">
                  {(id, d) => <TextInput id={id} aria-describedby={d} type="datetime-local" value={form.enteredAt} onChange={(e) => set("enteredAt", e.target.value)} />}
                </Field>
                {(form.operation === "sell" || form.operation === "switch") && (
                  <>
                    {me && (
                      <Field label={t("calc.portfolioForLots")}>
                        {(id) => (
                          <SelectInput id={id} value={form.portfolioId} onChange={(e) => set("portfolioId", e.target.value)}>
                            <option value="">—</option>
                            {(portfolios.data ?? []).map((p) => (
                              <option key={p.id} value={p.id!}>
                                {p.name}
                              </option>
                            ))}
                          </SelectInput>
                        )}
                      </Field>
                    )}
                    {!form.portfolioId && (
                      <Field label={t("calc.assumedAcquisition")}>{(id) => <TextInput id={id} type="date" value={form.assumedAcquisitionDate} onChange={(e) => set("assumedAcquisitionDate", e.target.value)} />}</Field>
                    )}
                  </>
                )}
                {!isExchange && <Checkbox label={t("calc.useForecast")} checked={form.useForecast} onChange={(e) => set("useForecast", e.target.checked)} />}
                {inputError && <Alert tone="danger">{inputError}</Alert>}
                <Button type="submit" busy={calc.isPending && !calc.variables}>
                  {t("calc.submit")}
                </Button>
              </>
            )}
          </form>
        </Card>
        <Card>
          {calc.error && calc.error.message !== "invalid-input" && <ErrorState error={calc.error} />}
          {result ? (
            <div className="flex flex-col gap-4">
              <CalculationResultView result={result} />
              {calc.data?.targetLeg && <CalculationResultView result={calc.data.targetLeg} title={t("calc.targetFund")} />}
              {needsConfirm && <Checkbox label={t("calc.confirmTimeline")} checked={confirmTimeline} onChange={(e) => setConfirmTimeline(e.target.checked)} />}
              {me ? (
                <Button variant="secondary" busy={calc.isPending && calc.variables === true} disabled={!!needsConfirm && !confirmTimeline} onClick={() => calc.mutate(true)}>
                  {t("calc.saveAsPlanned")}
                </Button>
              ) : (
                <Link href={`/${locale}/auth/login?returnUrl=${encodeURIComponent(`/${locale}/calculator?fundId=${form.fundId}`)}`} className="text-sm text-primary underline">
                  {t("calc.loginToSave")}
                </Link>
              )}
            </div>
          ) : (
            <p className="text-text-muted">{t("common.empty")}</p>
          )}
        </Card>
      </div>
      <Disclaimer variant="estimate" />
    </div>
  );
}

/** SF-06/07 — buy/sell/inverse/switch for open funds; exchange buy/sell for ETFs and closed funds (A7). No order CTA. */
export default function CalculatorPage() {
  return (
    <Suspense>
      <CalculatorInner />
    </Suspense>
  );
}
