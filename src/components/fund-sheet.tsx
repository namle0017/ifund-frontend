import Link from "next/link";
import type { ReactNode } from "react";
import { CompareButton } from "@/components/compare-button";
import { DataLabel } from "@/components/data";
import { GrowthChart, SheetTabs } from "@/components/fund-sheet-client";
import type { S } from "@/lib/api/client";
import { formatDate, formatDecimal, formatNav, formatRatioPercent } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";

type T = (key: string, fallback?: string) => string;

/**
 * SF-03 fund sheet (catalog modal and /funds/[id]): latest price, growth chart, overview, dealing schedule and fee
 * tables. Every value is read from the BE's verified data/rules; facts the platform does not hold (e.g. net assets)
 * are not shown rather than estimated (A4). ETF/closed funds keep market price and official NAV separate (BR-002).
 */
export function FundSheet({ f, info, locale, t, headingId, titleAs: Title = "h2" }: { f: S<"FundDetail">; info?: S<"FundTradingInfo"> | null; locale: Locale; t: T; headingId: string; titleAs?: "h1" | "h2" }) {
  const onExchange = f.type !== "OpenFund";
  const name = locale === "en" && f.nameEn ? f.nameEn : f.nameVi;
  const buy = info?.mechanisms?.find((m) => m.mechanism === "OpenFundSubscription" || m.mechanism === "ExchangeBuy");
  const sell = info?.mechanisms?.find((m) => m.mechanism === "OpenFundRedemption" || m.mechanism === "ExchangeSell");

  return (
    <article className="flex flex-col">
      <header className="flex items-center gap-4 border-b border-border px-5 py-5 pr-16 md:px-8 md:py-6">
        <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-info-bg text-lg font-semibold text-primary">
          {f.code.replace(/^SYN-/, "").slice(0, 2)}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <Title id={headingId} className="heading-lg md:text-[26px]">
            {name} ({f.code})
          </Title>
          <p className="flex flex-wrap items-center gap-2 text-text-secondary">
            {f.managementCompany ?? "—"}
            {f.isSynthetic && <DataLabel kind="synthetic" />}
          </p>
        </div>
      </header>

      <div className="grid gap-8 px-5 py-6 md:px-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-text-secondary">{t("sheet.latestPrice")}</p>
              {onExchange ? (
                <>
                  <p className="num display-lg mt-1">{f.latestMarketPrice ? `${formatDecimal(f.latestMarketPrice.close, locale)} VND` : "—"}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                    <DataLabel kind="market" /> {t("sheet.updatedOn")} {formatDate(f.latestMarketPrice?.tradeDate, locale)}
                  </p>
                  <p className="num mt-2 text-sm text-text-secondary">
                    {t("labels.officialNav")}: {f.latestNav ? `${formatNav(f.latestNav.calculationNav, locale)} (${formatDate(f.latestNav.valuationDate, locale)})` : "—"}
                  </p>
                </>
              ) : (
                <>
                  <p className="num display-lg mt-1">{f.latestNav ? `${formatNav(f.latestNav.calculationNav, locale)} VND` : "—"}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-muted">
                    <DataLabel kind="official" /> {t("sheet.updatedOn")} {formatDate(f.latestNav?.valuationDate, locale)}
                  </p>
                </>
              )}
              {(f.latestNav?.isStale || f.latestMarketPrice?.isStale) && (
                <span className="mt-2 inline-block">
                  <DataLabel kind="stale" />
                </span>
              )}
            </div>
            <div className="flex flex-col items-stretch gap-2">
              <Link href={`/${locale}/calculator?fundId=${f.id}`} className="btn btn-primary px-10 py-3 text-base">
                {t("funds.calculate")}
              </Link>
              <CompareButton fundId={f.id!} />
            </div>
          </div>

          <GrowthChart fundId={f.id!} fundType={f.type} />

          <section className="flex flex-col gap-2">
            <h3 className="eyebrow text-text-secondary">{t("sheet.strategy")}</h3>
            <p className="whitespace-pre-line leading-relaxed text-text-secondary">{(locale === "en" ? f.strategyEn : f.strategyVi) ?? "—"}</p>
          </section>
          <p className="flex flex-wrap gap-3 text-sm">
            <Link href={`/${locale}/funds/${f.id}/analytics`} className="text-primary">
              {t("sheet.moreAnalytics")}
            </Link>
            {!onExchange && (
              <Link href={`/${locale}/funds/${f.id}/forecast`} className="text-primary">
                {t("funds.forecast")}
              </Link>
            )}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <SheetTabs
            tabs={[
              { id: "overview", label: t("sheet.overview"), content: <Overview f={f} buy={buy} locale={locale} t={t} /> },
              { id: "documents", label: t("sheet.documents"), content: <Documents f={f} /> },
            ]}
          />
          {onExchange ? (
            <p className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-text-secondary">{t("sheet.exchangeFeeNote")}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FeeTable title={t("sheet.buyFee")} measureLabel={t("sheet.buyValue")} m={buy} locale={locale} t={t} />
              <FeeTable title={t("sheet.sellFee")} measureLabel={t("sheet.holdingPeriod")} m={sell} locale={locale} t={t} />
            </div>
          )}
          <p className="text-xs text-text-muted">{t("sheet.sourceNote")}</p>
        </div>
      </div>
    </article>
  );
}

function Overview({ f, buy, locale, t }: { f: S<"FundDetail">; buy?: S<"MechanismTradingInfo">; locale: Locale; t: T }) {
  const rows: [string, ReactNode][] = [
    [t("sheet.issuer"), f.managementCompany ?? "—"],
    [t("funds.supervisoryBank"), f.supervisoryBank ?? "—"],
    [t("sheet.fundType"), t(`fundType.${f.type}`)],
    [t("funds.distributionPolicy"), t(`distributionPolicy.${f.distributionPolicy}`)],
  ];
  if (f.type !== "OpenFund") {
    rows.push([t("funds.exchange"), [f.exchangeCode, f.exchangeTicker].filter(Boolean).join(" / ") || "—"]);
  }

  if (!buy || buy.missing?.length) {
    rows.push([t("sheet.dealingDays"), <span key="n" className="text-text-muted">{t("sheet.ruleUnavailable")}</span>]);
  } else {
    rows.push([t("sheet.dealingDays"), buy.dealingWeekdays?.length ? buy.dealingWeekdays.map((d) => t(`weekday.${d}`)).join(", ") : t("sheet.everyBusinessDay")]);
    const exchange = f.type !== "OpenFund";
    rows.push([t(exchange ? "sheet.nextTradingSession" : "sheet.nextSession"), formatDate(buy.nextDealingDay, locale)]);
    if (buy.nextCutoffLocal) {
      rows.push([t(exchange ? "sheet.orderBeforeExchange" : "sheet.orderBefore"), `${t("sheet.before")} ${buy.nextCutoffLocal.slice(11, 16)}, ${formatDate(buy.nextCutoffLocal, locale)} (GMT+7)`]);
    }

    if (buy.settlementOffset != null) {
      rows.push([t("sheet.settlement"), `T+${buy.settlementOffset}`]);
    }
  }

  return (
    <dl className="flex flex-col">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[minmax(8rem,2fr)_3fr] gap-4 py-3">
          <dt className="text-text-secondary">{k}</dt>
          <dd className="num text-base font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Documents({ f }: { f: S<"FundDetail"> }) {
  if (!f.documents?.length) {
    return <p className="text-text-muted">—</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {f.documents.map((d) => (
        <li key={d.url}>
          <a href={d.url} rel="noopener noreferrer" target="_blank" className="text-primary">
            {d.title}
          </a>
          {d.publishedOn && <span className="ml-2 text-xs text-text-muted">{d.publishedOn}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Fee tiers exactly as verified: amount tiers in VND, holding-period tiers in days (no unit conversion). */
function FeeTable({ title, measureLabel, m, locale, t }: { title: string; measureLabel: string; m?: S<"MechanismTradingInfo">; locale: Locale; t: T }) {
  const schedule = m?.fees;
  const kinds = ["Subscription", "Redemption"];
  const rule = schedule?.rules?.find((r) => kinds.includes(r.kind));
  const bound = (v: string, measure: S<"TierMeasure">) => (measure === "HoldingDays" ? `${formatDecimal(v, locale)} ${t("sheet.days")}` : formatDecimal(v, locale));
  const label = (tier: S<"FeeTierDto">, measure: S<"TierMeasure">) => {
    if (measure === "Flat" || (tier.fromInclusive == null && tier.toExclusive == null)) {
      return t("sheet.allValues");
    }

    if (tier.fromInclusive == null) {
      return `< ${bound(tier.toExclusive!, measure)}`;
    }

    if (tier.toExclusive == null) {
      return `≥ ${bound(tier.fromInclusive, measure)}`;
    }

    return `${bound(tier.fromInclusive, measure)} – < ${bound(tier.toExclusive, measure)}`;
  };

  let body: ReactNode;
  if (!schedule) {
    body = <p className="px-4 py-4 text-sm text-text-muted">{t("sheet.feeUnavailable")}</p>;
  } else if (!schedule.isVerified) {
    body = <p className="px-4 py-4 text-sm text-warning">{t("sheet.feeUnverified")}</p>;
  } else if (!rule) {
    body = <p className="px-4 py-4 text-sm">{t("sheet.noFee")}</p>;
  } else {
    body = (
      <table className="w-full text-sm">
        <caption className="sr-only">{title}</caption>
        <thead className="bg-surface-muted text-text-secondary">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-normal">
              {measureLabel}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-normal">
              {title}
            </th>
          </tr>
        </thead>
        <tbody>
          {rule.tiers.map((tier, i) => (
            <tr key={i} className="border-t border-border">
              <td className="num px-4 py-3">{label(tier, rule.measure)}</td>
              <td className="num px-4 py-3 text-right font-medium">{formatRatioPercent(tier.rate, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-raised">
      {!rule || !schedule?.isVerified ? <h4 className="border-b border-border bg-surface-muted px-4 py-3 text-sm text-text-secondary">{title}</h4> : null}
      {body}
    </section>
  );
}
