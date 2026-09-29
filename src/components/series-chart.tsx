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
      const css = (name: string) => styles.getPropertyValue(name).trim();
      const dates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort();
      chart = echarts.init(ref.current);
      chart.setOption({
        aria: { enabled: true },
        textStyle: { fontFamily: getComputedStyle(document.body).fontFamily },
        tooltip: {
          trigger: "axis",
          backgroundColor: css("--surface-raised"),
          borderColor: css("--border"),
          textStyle: { color: css("--text") },
          extraCssText: `box-shadow: ${css("--shadow-2")}; border-radius: 8px;`,
        },
        legend: { top: 0, left: 0, data: series.map((s) => s.name), icon: "roundRect", itemHeight: 3, textStyle: { color: css("--text-muted") } },
        grid: { left: 8, right: 16, top: 44, bottom: 8, containLabel: true },
        xAxis: {
          type: "category",
          data: dates,
          axisLine: { lineStyle: { color: css("--border") } },
          axisTick: { show: false },
          axisLabel: { color: css("--text-muted"), formatter: (v: string) => formatDate(v, locale) },
        },
        yAxis: { type: "value", scale: true, axisLabel: { color: css("--text-muted"), formatter: (v: number) => formatDecimal(String(v), locale) }, splitLine: { lineStyle: { color: css("--border") } } },
        series: series.map((s) => {
          const byDate = new Map(s.points.map((p) => [p.date, Number(p.value)]));
          return {
            name: s.name,
            type: "line",
            showSymbol: false,
            connectNulls: false,
            data: dates.map((d) => byDate.get(d) ?? null),
            lineStyle: { width: s.kind === "official" ? 2.5 : 2, type: s.kind === "forecast" ? "dashed" : "solid", color: css(colorVar[s.kind]) },
            itemStyle: { color: css(colorVar[s.kind]) },
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
      <figcaption className="heading-md">{title}</figcaption>
      <div ref={ref} role="img" aria-label={title} className="h-72 w-full" />
      <button type="button" className="self-start rounded-full px-2 py-1 text-xs text-primary underline underline-offset-2 hover:bg-info-bg" aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>
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
