"use client";

import { ApiError } from "@/lib/api/client";
import { formatDate, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { Alert, Badge, Button } from "./ui";

/** Mandatory data labels (04 §1): official NAV, market price, forecast, stale, unverified, simulation, synthetic. */
export function DataLabel({ kind }: { kind: "official" | "market" | "forecast" | "stale" | "unverified" | "simulation" | "synthetic" | "quarantined" }) {
  const { t } = useI18n();
  const map = {
    official: { tone: "official", key: "labels.officialNav" },
    market: { tone: "market", key: "labels.marketPrice" },
    forecast: { tone: "forecast", key: "labels.forecastNav" },
    stale: { tone: "warning", key: "labels.stale" },
    unverified: { tone: "warning", key: "labels.unverified" },
    simulation: { tone: "neutral", key: "labels.simulation" },
    synthetic: { tone: "danger", key: "labels.synthetic" },
    quarantined: { tone: "warning", key: "labels.quarantined" },
  } as const;
  const { tone, key } = map[kind];
  return <Badge tone={tone}>{t(key)}</Badge>;
}

export function SourceStamp({ asOf, valuationDate, source }: { asOf?: string | null; valuationDate?: string | null; source?: string | null }) {
  const { t, locale } = useI18n();
  return (
    <p className="text-xs text-text-muted">
      {valuationDate && (
        <>
          {t("labels.valuationDate")}: <time dateTime={valuationDate}>{formatDate(valuationDate, locale)}</time>
          {" · "}
        </>
      )}
      {asOf && (
        <>
          {t("common.asOf")}: <time dateTime={asOf}>{formatDateTime(asOf, locale)}</time>
        </>
      )}
      {source && (
        <>
          {" · "}
          {t("common.source")}: {source}
        </>
      )}
    </p>
  );
}

export function Disclaimer({ variant = "short" }: { variant?: "short" | "estimate" | "forecast" }) {
  const { t } = useI18n();
  return (
    <aside className="rounded-md border border-border bg-surface-muted px-3 py-2 text-xs text-text-muted">
      <p>{t(`disclaimer.${variant}`)}</p>
      <p className="mt-1 italic">{t("disclaimer.pendingLegal")}</p>
    </aside>
  );
}

/** Renders BE warning and missing-requirement codes with localized text (never hides them). */
export function WarningList({ warnings = [], missing = [] }: { warnings?: string[] | null; missing?: string[] | null }) {
  const { t } = useI18n();
  if (!warnings?.length && !missing?.length) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {!!missing?.length && (
        <Alert tone="danger" title={t("calc.missing")}>
          <ul className="list-disc pl-5">
            {missing.map((m) => (
              <li key={m}>{t(`missing.${m}`, m)}</li>
            ))}
          </ul>
        </Alert>
      )}
      {!!warnings?.length && (
        <Alert tone="warning" title={t("calc.warnings")}>
          <ul className="list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{t(`warnings.${w}`, w)}</li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}

export function problemCode(error: unknown): string {
  return error instanceof ApiError ? error.problem.code : "NETWORK";
}

/** Error state with support code and a retry only when safe (04 §9). */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  const problem = error instanceof ApiError ? error.problem : null;
  const code = problemCode(error);
  return (
    <Alert tone="danger" title={t(`errors.${code}`, t("common.error"))}>
      {problem?.fieldErrors?.length ? (
        <ul className="list-disc pl-5">
          {problem.fieldErrors.map((f) => (
            <li key={`${f.field}-${f.code}`}>
              {f.field}: {t(`errors.${f.code}`, f.code)}
            </li>
          ))}
        </ul>
      ) : null}
      {problem?.correlationId && (
        <p className="mt-1 text-xs">
          {t("common.supportCode")}: <code>{problem.correlationId}</code>
        </p>
      )}
      {onRetry && (problem?.retryable ?? true) && (
        <Button variant="secondary" className="mt-2" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </Alert>
  );
}
