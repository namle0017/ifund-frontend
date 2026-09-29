"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { S } from "@/lib/api/client";
import { formatDate, formatDateTime, formatRatioPercent, formatUnits, formatVnd } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { translate } from "@/lib/i18n/dictionaries";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9 },
  h1: { fontSize: 16, marginBottom: 6 },
  h2: { fontSize: 12, marginTop: 12, marginBottom: 4 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#ccc", paddingVertical: 2 },
  cell: { flex: 1 },
  note: { color: "#555", marginTop: 4 },
});

/**
 * ADR-005 / FR-REPORT-001..002: the PDF is rendered from the immutable BE report snapshot — values are printed as
 * delivered; data time, pending reconciliation and "not a statement" disclaimer are always included (§12.6).
 * Note: the built-in PDF fonts lack Vietnamese glyphs; a Unicode font must be registered before production (tracked).
 */
export function ReportPdf({ snapshot, locale, dict }: { snapshot: S<"ReportSnapshot">; locale: Locale; dict: Dictionary }) {
  const t = (k: string) => translate(dict, k);
  const s = snapshot.summary;
  return (
    <Document title={`iFund report ${snapshot.reportId}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.h1}>iFund — {t("reports.title")}</Text>
        <Text>
          {t("common.asOf")}: {formatDateTime(snapshot.generatedAt, locale)} · {formatDate(snapshot.from, locale)} → {formatDate(snapshot.to, locale)}
        </Text>
        <Text style={styles.note}>{t("reports.notStatement")}</Text>
        <Text style={styles.note}>
          {t("portfolio.pendingCount")}: {snapshot.pendingReconciliation}
        </Text>

        <Text style={styles.h2}>{t("portfolio.holdings")}</Text>
        {[
          [t("portfolio.totalCost"), formatVnd(s?.totalCost, locale)],
          [t("portfolio.marketValue"), s?.totalMarketValue != null ? formatVnd(s.totalMarketValue, locale) : t("common.notAvailable")],
          [t("portfolio.realized"), formatVnd(s?.realizedPnl, locale)],
          [t("portfolio.xirr"), s?.xirr?.value != null ? formatRatioPercent(s.xirr.value, locale) : `${t("common.notAvailable")} (${s?.xirr?.notAvailableReason ?? ""})`],
        ].map(([k, v]) => (
          <View key={k} style={styles.row}>
            <Text style={styles.cell}>{k}</Text>
            <Text style={styles.cell}>{v}</Text>
          </View>
        ))}
        {(s?.holdings ?? []).map((h) => (
          <View key={h.classId} style={styles.row}>
            <Text style={styles.cell}>{h.fundCode}</Text>
            <Text style={styles.cell}>{formatUnits(h.units, locale)}</Text>
            <Text style={styles.cell}>{h.marketValue != null ? formatVnd(h.marketValue, locale) : t("common.notAvailable")}</Text>
          </View>
        ))}

        <Text style={styles.h2}>{t("portfolio.transactions")}</Text>
        {(snapshot.transactions ?? []).map((x) => (
          <View key={x.id} style={styles.row} wrap={false}>
            <Text style={styles.cell}>{formatDate(x.tradeDate, locale)}</Text>
            <Text style={styles.cell}>{x.fundCode}</Text>
            <Text style={styles.cell}>{x.mechanism}</Text>
            <Text style={styles.cell}>{formatUnits(x.units, locale)}</Text>
            <Text style={styles.cell}>{formatVnd(x.netAmount, locale)}</Text>
            <Text style={styles.cell}>
              {x.userStatus} / {x.reconciliationStatus}
            </Text>
          </View>
        ))}
        <Text style={styles.note}>
          {snapshot.disclaimer} · {snapshot.methodologyVersion}
        </Text>
        <Text style={styles.note}>{t("disclaimer.pendingLegal")}</Text>
      </Page>
    </Document>
  );
}
