import Link from "next/link";
import { notFound } from "next/navigation";
import { CompareButton } from "@/components/compare-button";
import { DataLabel, SourceStamp } from "@/components/data";
import { safely, serverApi } from "@/lib/api/server";
import { formatDate, formatDecimal, formatNav } from "@/lib/format";
import { serverI18n } from "@/lib/i18n/server";

/** SF-03 — fund profile. NAV and market price are separate fields with their own dates (FR-FUND-003, BR-002). */
export default async function FundDetailPage({ params }: PageProps<"/[lang]/funds/[fundId]">) {
  const p = await params;
  const { locale, t } = await serverI18n(params);
  const { data: f, status } = await safely(() => serverApi.GET("/v1/funds/{id}", { params: { path: { id: p.fundId } } }));
  if (status === 404) {
    notFound();
  }

  if (!f) {
    return (
      <p role="alert" className="text-danger">
        {t("errors.UPSTREAM_UNAVAILABLE")}
      </p>
    );
  }

  const base = `/${locale}/funds/${f.id}`;
  const cls = f.classes?.[0];
  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="display-lg">{f.code}</h1>
          <span className="text-sm text-text-muted">{t(`fundType.${f.type}`)}</span>
          {f.isSynthetic && <DataLabel kind="synthetic" />}
        </div>
        <p className="text-lg">{locale === "en" && f.nameEn ? f.nameEn : f.nameVi}</p>
        {f.data?.sourceStatus === "VERIFIED_WITH_PENDING_REVIEW" && <p className="text-sm text-warning">{t("funds.pendingReview")}</p>}
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="eyebrow flex items-center gap-2 text-text-secondary">
            {t("labels.officialNav")} <DataLabel kind="official" />
            {f.latestNav?.isStale && <DataLabel kind="stale" />}
          </h2>
          {f.latestNav ? (
            <>
              <p className="num mt-3 display-lg">{formatNav(f.latestNav.calculationNav, locale)}</p>
              <p className="num text-xs text-text-muted">
                {t("labels.rawNav")}: {formatDecimal(f.latestNav.rawNav, locale)} · {t("labels.calcNav")}
              </p>
              <SourceStamp valuationDate={f.latestNav.valuationDate} asOf={f.latestNav.publishedAt} />
            </>
          ) : (
            <p className="mt-2 text-text-muted">{t("funds.noVerifiedData")}</p>
          )}
        </div>
        {f.type !== "OpenFund" && (
          <div className="card p-5">
            <h2 className="eyebrow flex items-center gap-2 text-text-secondary">
              {t("labels.marketPrice")} <DataLabel kind="market" />
              {f.latestMarketPrice?.isStale && <DataLabel kind="stale" />}
            </h2>
            {f.latestMarketPrice ? (
              <>
                <p className="num mt-3 display-lg">{formatDecimal(f.latestMarketPrice.close, locale)}</p>
                <p className="text-xs text-text-muted">
                  {t("labels.tradeDate")}: {formatDate(f.latestMarketPrice.tradeDate, locale)}
                </p>
              </>
            ) : (
              <p className="mt-2 text-text-muted">{t("funds.noVerifiedData")}</p>
            )}
            <p className="mt-2 text-xs text-text-muted">{t("calc.exchangeNote")}</p>
          </div>
        )}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href={`${base}/analytics`} className="btn btn-secondary">
          {t("funds.analytics")}
        </Link>
        {f.type === "OpenFund" && (
          <Link href={`${base}/forecast`} className="btn btn-secondary">
            {t("funds.forecast")}
          </Link>
        )}
        <Link href={`/${locale}/calculator?fundId=${f.id}`} className="btn btn-primary">
          {t("funds.calculate")}
        </Link>
        <CompareButton fundId={f.id!} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <dl className="grid grid-cols-1 gap-2 card p-5 text-sm">
          <Row label={t("funds.manager")} value={f.managementCompany} />
          <Row label={t("funds.supervisoryBank")} value={f.supervisoryBank} />
          {f.type !== "OpenFund" && <Row label={t("funds.exchange")} value={[f.exchangeCode, f.exchangeTicker].filter(Boolean).join(" / ")} />}
          <Row label={t("funds.distributionPolicy")} value={t(`distributionPolicy.${f.distributionPolicy}`)} />
          <Row label={t("funds.mechanisms")} value={cls?.supportedMechanisms?.map((m) => t(`mechanism.${m}`)).join(", ")} />
        </dl>
        <div className="card p-5 text-sm">
          <h2 className="heading-md">{t("funds.strategy")}</h2>
          <p className="mt-1 whitespace-pre-line text-text-muted">{(locale === "en" ? f.strategyEn : f.strategyVi) ?? "—"}</p>
          <h2 className="heading-md mt-4">{t("funds.documents")}</h2>
          {f.documents?.length ? (
            <ul className="mt-1 list-disc pl-5">
              {f.documents.map((d) => (
                <li key={d.url}>
                  <a href={d.url} rel="noopener noreferrer" target="_blank" className="text-primary hover:underline">
                    {d.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-text-muted">—</p>
          )}
        </div>
      </section>
    </article>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2">
      <dt className="text-text-muted">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
