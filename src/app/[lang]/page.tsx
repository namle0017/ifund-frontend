import Link from "next/link";
import { serverI18n } from "@/lib/i18n/server";

/** SF-01 — public home: gradient-mesh hero (rendered by the shell) + product mockup + fund-type pillars. */
export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { locale, t } = await serverI18n(params);
  return (
    <div className="flex flex-col gap-16 md:gap-24">
      <section className="grid items-center gap-10 pt-4 md:grid-cols-[1.1fr_1fr] md:pt-12">
        <div className="flex flex-col gap-6">
          <p className="eyebrow text-text-secondary">{t("home.eyebrow")}</p>
          <h1 className="display-xxl max-w-xl">{t("home.title")}</h1>
          <p className="max-w-lg text-lg text-text-secondary">{t("home.subtitle")}</p>
          <form action={`/${locale}/funds`} role="search" className="flex max-w-lg gap-2">
            <label htmlFor="home-q" className="sr-only">
              {t("home.searchPlaceholder")}
            </label>
            <input id="home-q" name="q" placeholder={t("home.searchPlaceholder")} className="field flex-1 shadow-card" />
            <button className="btn btn-primary">{t("common.search")}</button>
          </form>
          <div className="flex flex-wrap gap-3">
            <Link href={`/${locale}/funds`} className="btn btn-secondary">
              {t("home.ctaFunds")} →
            </Link>
            <Link href={`/${locale}/calculator`} className="btn text-primary hover:bg-info-bg">
              {t("home.ctaCalculator")} →
            </Link>
          </div>
        </div>
        <ProductMockup official={t("labels.officialNav")} market={t("labels.marketPrice")} forecast={t("labels.forecastNav")} caption={t("home.illustration")} />
      </section>

      <section className="flex flex-col gap-6">
        <h2 className="display-lg max-w-2xl">{t("home.pillarsTitle")}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(["OpenFund", "Etf", "ClosedFund"] as const).map((type, i) => (
            <Link
              key={type}
              href={`/${locale}/funds?type=${type}`}
              className={`group flex flex-col gap-3 rounded-xl border border-border p-6 transition-shadow hover:shadow-float md:p-8 ${i === 0 ? "bg-surface-cream" : "bg-surface-raised"}`}
            >
              <h3 className="heading-lg">{t(`fundType.${type}`)}</h3>
              <p className="text-sm text-text-secondary">{t(type === "OpenFund" ? "labels.officialNav" : "calc.exchangeNote")}</p>
              <span aria-hidden className="mt-auto text-primary transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Composited dashboard mockup (DESIGN-stripe.md signature component). Purely decorative shapes — no figures — so it can
 * never be mistaken for real NAV/price data (A4); the three series mirror the product's mandatory data labels.
 */
function ProductMockup({ official, market, forecast, caption }: { official: string; market: string; forecast: string; caption: string }) {
  return (
    <figure className="relative hidden md:block">
      <div className="rounded-2xl border border-border bg-surface-raised p-6 shadow-float">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-ruby" />
          <span className="h-2.5 w-2.5 rounded-full bg-primary-subdued" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="ml-3 h-2 w-24 rounded-full bg-surface-muted" />
        </div>
        <svg viewBox="0 0 320 150" className="w-full" aria-hidden>
          {[30, 70, 110].map((y) => (
            <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="var(--border)" strokeWidth="1" />
          ))}
          <path d="M0 110 C40 100 60 80 100 86 S160 60 200 62" fill="none" stroke="var(--primary)" strokeWidth="2.5" />
          <path d="M0 116 C40 108 62 90 100 94 S160 72 200 70" fill="none" stroke="var(--market)" strokeWidth="2" />
          <path d="M200 62 C240 56 270 44 320 36" fill="none" stroke="var(--forecast)" strokeWidth="2.5" strokeDasharray="6 5" />
          <path d="M200 62 C240 50 270 30 320 18 L320 54 C270 60 240 66 200 62 Z" fill="var(--forecast)" opacity="0.08" />
        </svg>
        <ul className="mt-4 flex flex-wrap gap-3 text-xs text-text-secondary">
          {[
            [official, "var(--primary)", false],
            [market, "var(--market)", false],
            [forecast, "var(--forecast)", true],
          ].map(([label, color, dashed]) => (
            <li key={String(label)} className="flex items-center gap-1.5">
              <span className={`inline-block w-4 border-t-2 ${dashed ? "border-dashed" : ""}`} style={{ borderColor: String(color) }} />
              {label}
            </li>
          ))}
        </ul>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg bg-surface-muted p-3">
              <span className="block h-1.5 w-10 rounded-full bg-border" />
              <span className="mt-2 block h-3 w-16 rounded-full bg-primary-subdued/70" />
            </div>
          ))}
        </div>
      </div>
      <figcaption className="mt-2 text-right text-xs text-text-muted">{caption}</figcaption>
    </figure>
  );
}
