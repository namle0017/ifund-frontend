import Link from "next/link";
import { CompareButton } from "@/components/compare-button";
import { DataLabel } from "@/components/data";
import { safely, serverApi } from "@/lib/api/server";
import { formatDate, formatNav, formatDecimal } from "@/lib/format";
import { serverI18n } from "@/lib/i18n/server";

type FundType = "OpenFund" | "Etf" | "ClosedFund";

/** SF-02 — search/filter funds; unavailable data is shown as "—", never as 0. */
export default async function FundsPage({ params, searchParams }: PageProps<"/[lang]/funds">) {
  const { locale, t } = await serverI18n(params);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  const type = (["OpenFund", "Etf", "ClosedFund"] as const).find((x) => x === sp.type) as FundType | undefined;
  const cursor = typeof sp.cursor === "string" ? sp.cursor : undefined;

  const { data } = await safely(() => serverApi.GET("/v1/funds", { params: { query: { q, type, cursor, limit: 20 } } }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="display-lg">{t("funds.title")}</h1>
      <form role="search" className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="q" className="text-sm text-text-secondary">
            {t("common.search")}
          </label>
          <input id="q" name="q" defaultValue={q} placeholder={t("home.searchPlaceholder")} className="field" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-sm text-text-secondary">
            {t("funds.filterType")}
          </label>
          <select id="type" name="type" defaultValue={type ?? ""} className="field">
            <option value="">{t("funds.all")}</option>
            {(["OpenFund", "Etf", "ClosedFund"] as const).map((x) => (
              <option key={x} value={x}>
                {t(`fundType.${x}`)}
              </option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary">{t("common.search")}</button>
      </form>

      {!data ? (
        <p role="alert" className="text-danger">
          {t("errors.UPSTREAM_UNAVAILABLE")}
        </p>
      ) : data.items?.length === 0 ? (
        <p className="text-text-muted">{t("funds.noResults")}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {data.items?.map((f) => (
            <li key={f.id} className="flex flex-col gap-2 card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/${locale}/funds/${f.id}`} className="text-lg font-medium text-primary">
                  {f.code}
                </Link>
                <span className="text-xs text-text-muted">{t(`fundType.${f.type}`)}</span>
                {f.isSynthetic && <DataLabel kind="synthetic" />}
              </div>
              <p className="text-sm">{locale === "en" && f.nameEn ? f.nameEn : f.nameVi}</p>
              {f.managementCompany && <p className="text-xs text-text-muted">{f.managementCompany}</p>}
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="flex items-center gap-1 text-xs text-text-muted">
                    {t("funds.latestNav")} <DataLabel kind="official" />
                  </dt>
                  <dd className="num mt-1 text-base">
                    {f.latestNav ? formatNav(f.latestNav.calculationNav, locale) : "—"}
                    {f.latestNav && <span className="ml-1 text-xs text-text-muted">({formatDate(f.latestNav.valuationDate, locale)})</span>}
                    {f.latestNav?.isStale && <span className="ml-1"><DataLabel kind="stale" /></span>}
                  </dd>
                </div>
                {f.type !== "OpenFund" && (
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-text-muted">
                      {t("funds.latestPrice")} <DataLabel kind="market" />
                    </dt>
                    <dd className="num mt-1 text-base">
                      {f.latestMarketPrice ? formatDecimal(f.latestMarketPrice.close, locale) : "—"}
                      {f.latestMarketPrice && <span className="ml-1 text-xs text-text-muted">({formatDate(f.latestMarketPrice.tradeDate, locale)})</span>}
                    </dd>
                  </div>
                )}
              </dl>
              <CompareButton fundId={f.id!} />
            </li>
          ))}
        </ul>
      )}
      {data?.nextCursor && (
        <Link
          href={`/${locale}/funds?${new URLSearchParams({ ...(q ? { q } : {}), ...(type ? { type } : {}), cursor: data.nextCursor }).toString()}`}
          className="btn btn-secondary self-start"
        >
          {t("funds.loadMore")}
        </Link>
      )}
    </div>
  );
}
