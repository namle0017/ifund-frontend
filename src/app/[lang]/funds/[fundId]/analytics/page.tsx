import { notFound } from "next/navigation";
import { safely, serverApi } from "@/lib/api/server";
import { serverI18n } from "@/lib/i18n/server";
import { AnalyticsView } from "./analytics-view";

export default async function AnalyticsPage({ params }: PageProps<"/[lang]/funds/[fundId]/analytics">) {
  const { fundId } = await params;
  const { t } = await serverI18n(params);
  const { data, status } = await safely(() => serverApi.GET("/v1/funds/{id}", { params: { path: { id: fundId } } }));
  if (status === 404) {
    notFound();
  }

  if (!data) {
    return (
      <p role="alert" className="text-danger">
        {t("errors.UPSTREAM_UNAVAILABLE")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="display-lg">
        {data.code} — {t("funds.analytics")}
      </h1>
      <AnalyticsView fundId={fundId} fundType={data.type!} />
    </div>
  );
}
