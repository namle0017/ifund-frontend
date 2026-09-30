"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ErrorState } from "@/components/data";
import { SeriesChart } from "@/components/series-chart";
import { Loading } from "@/components/ui";
import { api, call, type S } from "@/lib/api/client";
import { formatRatioPercent } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

const PERIODS = ["YTD", "6M", "1Y", "2Y", "3Y", "5Y", "ALL"] as const;

/**
 * Growth chart with period tabs. The period change comes from the BE analytics (official NAV for open funds, market
 * close for ETF/closed funds); an unavailable value shows "—" with its reason, never 0.
 */
export function GrowthChart({ fundId, fundType }: { fundId: string; fundType: S<"FundType"> }) {
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("1Y");
  const onExchange = fundType !== "OpenFund";
  const analytics = useQuery({
    queryKey: ["analytics", fundId, period],
    queryFn: () => call(() => api.GET("/v1/funds/{id}/analytics", { params: { path: { id: fundId }, query: { period } } })),
  });
  const from = analytics.data?.from;
  const series = useQuery({
    queryKey: [onExchange ? "market" : "nav", fundId, from],
    enabled: !!from,
    queryFn: () =>
      onExchange
        ? call(() => api.GET("/v1/funds/{id}/prices", { params: { path: { id: fundId }, query: { from: from! } } }))
        : call(() => api.GET("/v1/funds/{id}/nav", { params: { path: { id: fundId }, query: { from: from! } } })),
  });
  const change = analytics.data?.priceReturn;
  const title = t(onExchange ? "sheet.priceGrowth" : "sheet.navGrowth");

  return (
    <section aria-labelledby="growth-title" className="flex flex-col gap-3">
      <h3 id="growth-title" className="eyebrow text-text-secondary">
        {title}
      </h3>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label={t("analytics.period")} className="flex flex-wrap gap-x-4 gap-y-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === period}
              onClick={() => setPeriod(p)}
              className={`border-b-2 pb-1 text-sm transition-colors ${p === period ? "border-primary font-medium text-primary" : "border-transparent text-text-secondary hover:text-text"}`}
            >
              {t(`sheet.periods.${p}`)}
            </button>
          ))}
        </div>
        <p className="num text-right">
          <span className="sr-only">{t("sheet.periodReturn")}: </span>
          {change?.value != null ? (
            <span className={`text-2xl font-light ${change.value.startsWith("-") ? "text-danger" : "text-success"}`}>
              {change.value.startsWith("-") ? "" : "+ "}
              {formatRatioPercent(change.value, locale)}
            </span>
          ) : (
            <span className="text-sm text-text-muted" title={change?.notAvailableReason ? t(`notes.${change.notAvailableReason}`, change.notAvailableReason) : undefined}>
              — {change?.notAvailableReason && <span className="text-xs">({t(`notes.${change.notAvailableReason}`, change.notAvailableReason)})</span>}
            </span>
          )}
        </p>
      </div>
      {analytics.isPending || (!!from && series.isPending) ? (
        <Loading label={t("common.loading")} />
      ) : analytics.error || series.error ? (
        <ErrorState error={analytics.error ?? series.error} onRetry={() => void (analytics.error ? analytics.refetch() : series.refetch())} />
      ) : (
        <SeriesChart
          hideCaption
          title={title}
          series={[{ name: t(onExchange ? "labels.marketPrice" : "labels.officialNav"), kind: onExchange ? "market" : "official", points: (series.data?.points ?? []).map((p) => ({ date: p.date, value: p.value })) }]}
        />
      )}
    </section>
  );
}

/** Accessible tab strip; panels are rendered by the server and passed in. */
export function SheetTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" className="flex gap-6 overflow-x-auto overflow-y-hidden border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className={`-mb-px whitespace-nowrap border-b-2 pb-2 text-base transition-colors ${tab.id === active ? "border-primary text-primary" : "border-transparent text-text-secondary hover:text-text"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} id={`panel-${tab.id}`} role="tabpanel" aria-labelledby={`tab-${tab.id}`} hidden={tab.id !== active}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}

const noopSubscribe = () => () => {};

/** Modal frame for the fund sheet opened from the catalog (?fund=…): Escape / backdrop / ✕ return to the list URL. */
export function SheetModal({ closeHref, labelledBy, closeLabel, children }: { closeHref: string; labelledBy: string; closeLabel: string; children: ReactNode }) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  // Portal to <body> so the overlay sits above the sticky site header (main is its own stacking context).
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.push(closeHref, { scroll: false });
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, [closeHref, router, mounted]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0d253d]/50 p-0 backdrop-blur-sm md:p-8" onMouseDown={(e) => e.target === e.currentTarget && router.push(closeHref, { scroll: false })}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} className="relative w-full max-w-6xl rounded-none bg-surface-raised shadow-float outline-none md:rounded-2xl">
        <button
          type="button"
          onClick={() => router.push(closeHref, { scroll: false })}
          aria-label={closeLabel}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-2xl text-text-secondary hover:bg-surface-muted hover:text-text md:right-5 md:top-5"
        >
          ×
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
