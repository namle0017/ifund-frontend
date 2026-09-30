import { notFound } from "next/navigation";
import { FundSheet } from "@/components/fund-sheet";
import { safely, serverApi } from "@/lib/api/server";
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

  const { data: info } = await safely(() => serverApi.GET("/v1/funds/{id}/trading-info", { params: { path: { id: p.fundId } } }));
  return (
    <div className="card overflow-hidden">
      <FundSheet f={f} info={info} locale={locale} t={t} headingId="fund-title" titleAs="h1" />
    </div>
  );
}
