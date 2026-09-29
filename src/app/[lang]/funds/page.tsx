import Link from "next/link";
import { CompareButton } from "@/components/compare-button";
import { DataLabel } from "@/components/data";
import type { S } from "@/lib/api/client";
import { safely, serverApi } from "@/lib/api/server";
import { formatDate, formatDecimal, formatNav, formatRatioPercent } from "@/lib/format";
import { serverI18n } from "@/lib/i18n/server";

type FundType = "OpenFund" | "Etf" | "ClosedFund";

/**
 * SF-02 — fund catalog as a comparison table (latest price, 1Y return, 3Y annualised return). Every figure comes from the
 * BE; unavailable metrics are shown as "—" with the reason, never as 0. ETF/closed funds show the market price with the
 * official NAV beside it, never merged.
 */
export default async function FundsPage({ params, searchParams }: PageProps<"/[lang]/funds">) {
  const { locale, t } = await serverI18n(params);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const type = (["OpenFund", "Etf", "ClosedFund"] as const).find((x) => x === sp.type) as FundType | undefined;
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;
  const sort = (["return1y", "return3y"] as const).find((x) => x === sp.sort) ?? "code";

  const { data } = await safely(() => serverApi.GET("/v1/funds", { params: { query: { q, type, cursor, limit: 20, sort: sort === "code" ? undefined : sort } } }));
  const query = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, type, sort: sort === "code" ? undefined : sort, ...extra })) {
      if (v) {
        p.set(k, v);
      }
    }

    const s = p.toString();
    return `/${locale}/funds${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="display-lg">{t("funds.title")}</h1>
      <form role="search" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-sm text-text-secondary">
            {t("common.search")}
          </label>
          <input id="q" name="q" defaultValue={q} placeholder={t("home.searchPlaceholder")} className="field bg-surface shadow-card" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm text-text-secondary">
            {t("funds.filterType")}
          </label>
          <select id="type" name="type" defaultValue={type ?? ""} className="field bg-surface shadow-card">
            <option value="">{t("funds.all")}</option>
            {(["OpenFund", "Etf", "ClosedFund"] as const).map((x) => (
              <option key={x} value={x}>
                {t(`fundType.${x}`)}
              </option>
            ))}
          </select>
        </div>
        {sort !== "code" && <input type="hidden" name="sort" value={sort} />}
        <button className="btn btn-primary">{t("common.search")}</button>
      </form>

      {!data ? (
        <p role="alert" className="text-danger">
          {t("errors.UPSTREAM_UNAVAILABLE")}
        </p>
      ) : data.items?.length === 0 ? (
        <p className="text-text-muted">{t("funds.noResults")}</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-raised shadow-float">
          {/* Phones: one card per fund instead of a horizontally scrolling table. */}
          <ul className="divide-y divide-border md:hidden">
            {data.items?.map((f) => (
              <FundCard key={f.id} f={f} locale={locale} t={t} />
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-[15px]">
              <caption className="sr-only">{t("funds.title")}</caption>
              <thead className="bg-surface-muted text-left text-sm text-text-secondary">
                <tr>
                  <th scope="col" className="px-4 py-4 font-medium md:px-6">
                    {t("funds.colName")}
                  </th>
                  <th scope="col" className="hidden px-4 py-4 font-medium lg:table-cell">
                    {t("funds.colIssuer")}
                  </th>
                  <th scope="col" className="px-4 py-4 text-right font-medium">
                    {t("funds.colPrice")}
                  </th>
                  <SortHeader label={t("funds.colReturn1y")} active={sort === "return1y"} href={query({ sort: sort === "return1y" ? undefined : "return1y" })} t={t} />
                  <SortHeader label={t("funds.colReturn3y")} active={sort === "return3y"} href={query({ sort: sort === "return3y" ? undefined : "return3y" })} t={t} className="hidden md:table-cell" />
                  <th scope="col" className="px-4 py-4 md:px-6">
                    <span className="sr-only">{t("funds.colAction")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items?.map((f) => (
                  <FundRow key={f.id} f={f} locale={locale} t={t} />
                ))}
              </tbody>
            </table>
          </div>
          {data.nextCursor && (
            <div className="flex justify-center border-t border-border py-6">
              <Link href={query({ cursor: data.nextCursor })} className="btn btn-secondary px-8">
                {t("funds.loadMore")}
              </Link>
            </div>
          )}
        </div>
      )}
      <p className="max-w-3xl text-xs text-text-muted">{t("funds.returnsNote")}</p>
    </div>
  );
}

function SortHeader({ label, active, href, t, className = "" }: { label: string; active: boolean; href: string; t: (k: string) => string; className?: string }) {
  return (
    <th scope="col" aria-sort={active ? "descending" : "none"} className={`min-w-32 px-3 py-4 text-right font-medium ${className}`}>
      <Link href={href} className={`inline-flex items-center justify-end gap-1.5 hover:text-primary ${active ? "text-primary" : ""}`} aria-label={`${t("funds.sortBy")} ${label}${active ? ` (${t("funds.sortedDesc")})` : ""}`}>
        <span className="max-w-36 text-right">{label}</span>
        <svg aria-hidden viewBox="0 0 10 6" className={`h-2 w-3 shrink-0 ${active ? "fill-primary" : "fill-text-muted/60"}`}>
          <path d="M0 0h10L5 6z" />
        </svg>
      </Link>
    </th>
  );
}

function FundRow({ f, locale, t }: { f: S<"FundListItem">; locale: "vi" | "en"; t: (k: string, fb?: string) => string }) {
  const onExchange = f.type !== "OpenFund";
  return (
    <tr className="border-t border-border align-middle transition-colors hover:bg-surface-muted/60">
      <td className="px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <span aria-hidden className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-bg text-sm font-medium text-primary sm:flex">
            {f.code.replace(/^SYN-/, "").slice(0, 2)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-2">
              <Link href={`/${locale}/funds/${f.id}`} className="text-base font-medium text-primary">
                {f.code}
              </Link>
              {f.isSynthetic && <DataLabel kind="synthetic" />}
            </span>
            <span className="text-sm text-text-muted">{t(`fundType.${f.type}`)}</span>
          </div>
        </div>
      </td>
      <td className="hidden px-4 py-4 text-sm text-text-secondary lg:table-cell">{f.managementCompany ?? "—"}</td>
      <td className="num px-4 py-4 text-right">
        {onExchange ? (
          <>
            <span className="block text-base">{f.latestMarketPrice ? formatDecimal(f.latestMarketPrice.close, locale) : "—"}</span>
            <span className="block whitespace-nowrap text-xs text-text-muted">
              {t("funds.priceByMarket")} {formatDate(f.latestMarketPrice?.tradeDate, locale)}
            </span>
            <span className="mt-1 ml-auto block max-w-44 text-xs text-text-muted">
              {t("funds.navReference")}: {f.latestNav ? `${formatNav(f.latestNav.calculationNav, locale)} (${formatDate(f.latestNav.valuationDate, locale)})` : "—"}
            </span>
          </>
        ) : (
          <>
            <span className="block text-base">{f.latestNav ? formatNav(f.latestNav.calculationNav, locale) : "—"}</span>
            <span className="block whitespace-nowrap text-xs text-text-muted">
              {t("funds.priceByNav")} {formatDate(f.latestNav?.valuationDate, locale)}
            </span>
          </>
        )}
        {(f.latestNav?.isStale || f.latestMarketPrice?.isStale) && (
          <span className="mt-1 inline-block">
            <DataLabel kind="stale" />
          </span>
        )}
      </td>
      <ReturnCell m={f.return1Y} locale={locale} t={t} />
      <ReturnCell m={f.annualizedReturn3Y} locale={locale} t={t} className="hidden md:table-cell" />
      <td className="px-4 py-4 md:px-6">
        <div className="flex flex-col items-end gap-2">
          <Link href={`/${locale}/calculator?fundId=${f.id}`} className="btn btn-primary min-h-9 px-5 text-sm">
            {t("funds.calculate")}
          </Link>
          <CompareButton fundId={f.id!} />
        </div>
      </td>
    </tr>
  );
}

function FundCard({ f, locale, t }: { f: S<"FundListItem">; locale: "vi" | "en"; t: (k: string, fb?: string) => string }) {
  const onExchange = f.type !== "OpenFund";
  const price = onExchange ? f.latestMarketPrice?.close : f.latestNav?.calculationNav;
  const r = f.return1Y;
  return (
    <li className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <Link href={`/${locale}/funds/${f.id}`} className="text-base font-medium text-primary">
            {f.code}
          </Link>
          <span className="text-sm text-text-muted">
            {t(`fundType.${f.type}`)}
            {f.managementCompany ? ` · ${f.managementCompany}` : ""}
          </span>
          {f.isSynthetic && (
            <span>
              <DataLabel kind="synthetic" />
            </span>
          )}
        </div>
        <div className="num text-right">
          <span className="block text-base">{price ? (onExchange ? formatDecimal(price, locale) : formatNav(price, locale)) : "—"}</span>
          <span className="block text-xs text-text-muted">
            {onExchange ? t("funds.priceByMarket") : t("funds.priceByNav")} {formatDate(onExchange ? f.latestMarketPrice?.tradeDate : f.latestNav?.valuationDate, locale)}
          </span>
          {onExchange && (
            <span className="block text-xs text-text-muted">
              {t("funds.navReference")}: {f.latestNav ? formatNav(f.latestNav.calculationNav, locale) : "—"}
            </span>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-text-muted">{t("funds.colReturn1y")}</dt>
          <dd className={`num ${r?.value == null ? "text-text-muted" : r.value.startsWith("-") ? "text-danger" : "text-success"}`}>{r?.value == null ? "—" : formatRatioPercent(r.value, locale)}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-muted">{t("funds.colReturn3y")}</dt>
          <dd className="num">{f.annualizedReturn3Y?.value == null ? "—" : formatRatioPercent(f.annualizedReturn3Y.value, locale)}</dd>
        </div>
      </dl>
      <div className="flex items-center gap-2">
        <Link href={`/${locale}/calculator?fundId=${f.id}`} className="btn btn-primary min-h-10 flex-1 text-sm">
          {t("funds.calculate")}
        </Link>
        <CompareButton fundId={f.id!} />
      </div>
    </li>
  );
}

function ReturnCell({ m, locale, t, className = "" }: { m: S<"MetricDto">; locale: "vi" | "en"; t: (k: string, fb?: string) => string; className?: string }) {
  const value = m?.value;
  const tone = value == null ? "text-text-muted" : value.startsWith("-") ? "text-danger" : /^0(\.0*)?$/.test(value) ? "text-text" : "text-success";
  return (
    <td className={`num px-4 py-4 text-right text-base ${tone} ${className}`} title={value == null && m?.notAvailableReason ? t(`notes.${m.notAvailableReason}`, m.notAvailableReason) : undefined}>
      {value == null ? (
        <>
          —{m?.notAvailableReason && <span className="sr-only"> ({t(`notes.${m.notAvailableReason}`, m.notAvailableReason)})</span>}
        </>
      ) : (
        formatRatioPercent(value, locale)
      )}
    </td>
  );
}
