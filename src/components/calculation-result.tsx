"use client";

import type { S } from "@/lib/api/client";
import { formatDate, formatDateTime, formatDecimal, formatNav, formatRatioPercent, formatUnits, formatVnd } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { DataLabel, WarningList } from "./data";
import { Alert, DataTable } from "./ui";

/**
 * SF-07 — renders the BE result verbatim: display amounts come from the BE rounding policy (A3). When the result is
 * INCOMPLETE, money totals are not presented as definitive (FR-CALC-008, SR-CALC-007).
 */
export function CalculationResultView({ result, title }: { result: S<"CalculationResult">; title?: string }) {
  const { t, locale } = useI18n();
  const complete = result.status === "Complete";
  const isSell = result.mechanism === "OpenFundRedemption" || result.mechanism === "ExchangeSell" || result.mechanism === "OpenFundSwitch";
  const d = result.display;
  const isExchange = result.pricingBasis === "MarketPriceUserEntered";

  if (result.status === "Unsupported") {
    return (
      <Alert tone="danger" title={t("calc.missing")}>
        {(result.missing ?? []).map((m) => t(`missing.${m}`, m)).join(", ")}
      </Alert>
    );
  }

  const row = (label: string, value: React.ReactNode, strong = false) => (
    <div className="grid grid-cols-[1fr_auto] gap-4 border-b border-border/60 py-1">
      <dt className="text-sm text-text-muted">{label}</dt>
      <dd className={`num text-right ${strong ? "text-lg font-bold" : ""}`}>{value}</dd>
    </div>
  );

  return (
    <section aria-live="polite" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{title ?? t("calc.result")}</h2>
        <DataLabel kind="simulation" />
        {!complete && <span className="rounded bg-danger-bg px-2 py-0.5 text-xs font-semibold text-danger">{t("labels.incomplete")}</span>}
        {result.pricingBasis === "ForecastNav" && <DataLabel kind="forecast" />}
        {isExchange && <DataLabel kind="market" />}
        {result.pricingBasis === "VerifiedNav" && <DataLabel kind="official" />}
      </div>

      <WarningList warnings={result.warnings} missing={result.missing} />
      {!complete && <Alert tone="danger">{t("calc.notDefinitive")}</Alert>}

      <dl>
        {row(
          `${t("calc.priceUsed")}${result.priceDate ? ` (${formatDate(result.priceDate, locale)})` : ""}`,
          result.calculationPrice ? (isExchange ? formatDecimal(result.calculationPrice, locale) : formatNav(result.calculationPrice, locale)) : "—",
        )}
        {result.rawNav && !isExchange && row(t("labels.rawNav"), formatDecimal(result.rawNav, locale))}
        {isExchange && result.referenceNav && row(t("calc.referenceNav"), formatNav(result.referenceNav, locale))}
        {isExchange && result.referenceClosePrice && row(t("calc.referenceClose"), formatDecimal(result.referenceClosePrice, locale))}
        {result.investmentAmount && row(t("calc.amount"), formatVnd(result.investmentAmount, locale))}
        {row(t("calc.unitsResult"), formatUnits(result.units, locale), true)}
        {row(t("calc.gross"), formatVnd(d?.gross, locale))}
        {!isSell && row(t("calc.allocated"), formatVnd(d?.allocated, locale))}
        {!isSell && d?.unallocated != null && row(t("calc.unallocated"), formatVnd(d.unallocated, locale))}
        {row(t("calc.fees"), complete || d?.totalFees ? formatVnd(d?.totalFees, locale) : t("common.notAvailable"))}
        {isSell && row(t("calc.taxes"), d?.totalTaxes != null ? formatVnd(d.totalTaxes, locale) : t("common.notAvailable"))}
        {row(isSell ? t("calc.netSell") : t("calc.netBuy"), complete ? formatVnd(d?.net, locale) : t("common.notAvailable"), true)}
      </dl>

      {!!result.fees?.length && (
        <DataTable
          caption={t("calc.fees")}
          headers={[t("calc.fees"), t("calc.gross"), "%", t("common.value")]}
          rows={result.fees.map((f) => [
            `${t(`feeKind.${f.kind}`, f.kind)}${f.isUserAssumption ? ` (${t("labels.userDeclared")})` : ""}`,
            formatVnd(f.baseAmount, locale),
            formatRatioPercent(f.rate, locale, 3),
            formatVnd(f.amount, locale),
          ])}
        />
      )}
      {!!result.taxes?.length && (
        <DataTable caption={t("calc.taxes")} headers={[t("calc.taxes"), t("calc.gross"), "%", t("common.value")]} rows={result.taxes.map((x) => [t(`taxBase.${x.base}`, x.base), formatVnd(x.baseAmount, locale), formatRatioPercent(x.rate, locale, 3), formatVnd(x.amount, locale)])} />
      )}
      {!!result.embeddedFeesInformation?.length && (
        <p className="text-xs text-text-muted">
          {t("calc.embeddedFees")}: {result.embeddedFeesInformation.map((f) => `${t(`feeKind.${f.kind}`, f.kind)} ${formatRatioPercent(f.tiers?.[0]?.rate, locale)}`).join(", ")}
        </p>
      )}
      {!!result.lots?.length && (
        <DataTable
          caption={t("calc.lots")}
          headers={[t("calc.lots"), t("calc.units"), t("calc.holdingDays"), t("calc.fees")]}
          rows={result.lots.map((l) => [l.acquiredOn ? formatDate(l.acquiredOn, locale) : "—", formatUnits(l.units, locale), l.holdingDays ?? "—", l.feeAmount != null ? formatVnd(l.feeAmount, locale) : "—"])}
        />
      )}
      {result.timeline && <TimelineView timeline={result.timeline} />}
      {!!result.ruleVersions && Object.keys(result.ruleVersions).length > 0 && (
        <details className="text-xs text-text-muted">
          <summary>{t("calc.ruleVersions")}</summary>
          <ul>
            {Object.entries(result.ruleVersions).map(([k, v]) => (
              <li key={k}>
                {k}: {String(v)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

/** BR-007: each milestone is shown separately; unknown milestones are shown as "—", never guessed. Vertical on mobile. */
export function TimelineView({ timeline }: { timeline: S<"Timeline"> }) {
  const { t, locale } = useI18n();
  const items: [string, string | null | undefined, boolean?][] = [
    ["calc.cutoff", timeline.cutoffDeadlineLocal, true],
    ["calc.dealing", timeline.dealingDay],
    ["calc.valuation", timeline.valuationDay],
    ["calc.publication", timeline.publicationDay],
    ["calc.allocation", timeline.allocationDay],
    ["calc.confirmation", timeline.confirmationDay],
    ["calc.settlement", timeline.settlementDay],
  ];
  return (
    <div>
      <h3 className="font-semibold">{t("calc.timeline")}</h3>
      {timeline.status !== "Complete" && <WarningList missing={timeline.missing} />}
      <ol className="mt-2 flex flex-col gap-2 border-l-2 border-border pl-4 md:flex-row md:gap-6 md:border-l-0 md:pl-0">
        {items.map(([k, v, isDateTime]) => (
          <li key={k} className="text-sm">
            <span className="block text-xs text-text-muted">{t(k)}</span>
            <span className="num">{v ? (isDateTime ? formatDateTime(`${v}+07:00`, locale) : formatDate(v, locale)) : "—"}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
