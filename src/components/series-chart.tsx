"use client";

import { useEffect, useRef, useState } from "react";
import { formatDate, formatDecimal } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

export interface ChartSeries {
  name: string;
  kind: "official" | "market" | "forecast" | "benchmark";
  points: { date: string; value: string }[];
}

const colorVar: Record<ChartSeries["kind"], string> = { official: "--primary", market: "--market", forecast: "--forecast", benchmark: "--text-muted" };

/**
 * 14 §5: legend, gaps are not joined (connectNulls=false on a shared date axis), forecast drawn dashed, and a
 * data-table alternative for screen readers / small screens. Values are parsed to numbers only for plotting.
 */
export function SeriesChart({ series, title }: { series: ChartSeries[]; title: string }) {
  const { t, locale } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    if (!ref.current) {
      return;
    }

    let disposed = false;
    let chart: { setOption: (o: unknown) => void; dispose: () => void; resize: () => void } | undefined;
    const onResize = () => chart?.resize();
    void import("echarts").then((echarts) => {
      if (disposed || !ref.current) {
        return;
      }

      const styles = getComputedStyle(document.documentElement);
      const dates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort();
      chart = echarts.init(ref.current);
      chart.setOption({
        aria: { enabled: true },
        tooltip: { trigger: "axis" },
        legend: { data: series.map((s) => s.name), textStyle: { color: styles.getPropertyValue("--text") } },
        grid: { left: 60, right: 20, top: 40, bottom: 40 },
        xAxis: { type: "category", data: dates, axisLabel: { formatter: (v: string) => formatDate(v, locale) } },
        yAxis: { type: "value", scale: true },
        series: series.map((s) => {
          const byDate = new Map(s.points.map((p) => [p.date, Number(p.value)]));
          return {
            name: s.name,
            type: "line",
            showSymbol: false,
            connectNulls: false,
            data: dates.map((d) => byDate.get(d) ?? null),
            lineStyle: { type: s.kind === "forecast" ? "dashed" : "solid", color: styles.getPropertyValue(colorVar[s.kind]).trim() },
            itemStyle: { color: styles.getPropertyValue(colorVar[s.kind]).trim() },
          };
        }),
      });
      window.addEventListener("resize", onResize);
    });
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      chart?.dispose();
    };
  }, [series, locale]);

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-semibold">{title}</figcaption>
      <div ref={ref} role="img" aria-label={title} className="h-72 w-full" />
      <button type="button" className="self-start text-xs text-primary underline" aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>
        {t("common.tableAlternative")}
      </button>
      {showTable && (
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th scope="col" className="text-left">
                  {t("common.date")}
                </th>
                {series.map((s) => (
                  <th key={s.name} scope="col" className="text-right">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date))))
                .sort()
                .map((d) => (
                  <tr key={d}>
                    <td>{formatDate(d, locale)}</td>
                    {series.map((s) => (
                      <td key={s.name} className="num text-right">
                        {formatDecimal(s.points.find((p) => p.date === d)?.value, locale)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
