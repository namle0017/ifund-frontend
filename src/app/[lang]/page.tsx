import Link from "next/link";
import { serverI18n } from "@/lib/i18n/server";

/** SF-01 — public home. */
export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { locale, t } = await serverI18n(params);
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4 py-8">
        <h1 className="text-3xl font-bold">{t("home.title")}</h1>
        <p className="max-w-2xl text-text-muted">{t("home.subtitle")}</p>
        <form action={`/${locale}/funds`} role="search" className="flex max-w-xl gap-2">
          <label htmlFor="home-q" className="sr-only">
            {t("home.searchPlaceholder")}
          </label>
          <input id="home-q" name="q" placeholder={t("home.searchPlaceholder")} className="min-h-10 flex-1 rounded-md border border-border bg-surface px-3" />
          <button className="rounded-md bg-primary px-4 text-sm font-medium text-primary-contrast">{t("common.search")}</button>
        </form>
        <div className="flex flex-wrap gap-3">
          <Link href={`/${locale}/funds`} className="rounded-md border border-border px-4 py-2 text-sm">
            {t("home.ctaFunds")}
          </Link>
          <Link href={`/${locale}/calculator`} className="rounded-md border border-border px-4 py-2 text-sm">
            {t("home.ctaCalculator")}
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
        {(["OpenFund", "Etf", "ClosedFund"] as const).map((type) => (
          <Link key={type} href={`/${locale}/funds?type=${type}`} className="rounded-lg border border-border p-4 hover:bg-surface-muted">
            <h2 className="font-semibold">{t(`fundType.${type}`)}</h2>
            <p className="mt-1 text-sm text-text-muted">{t(type === "OpenFund" ? "labels.officialNav" : "calc.exchangeNote")}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
