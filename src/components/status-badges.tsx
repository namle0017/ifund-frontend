"use client";

import type { S } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { Badge } from "./ui";

/** BR-008: submitted/confirmed are shown as user declarations, never as issuer confirmations. */
export function UserStatusBadge({ status }: { status: S<"UserStatus"> }) {
  const { t } = useI18n();
  const tone = status === "Completed" ? "success" : status === "Canceled" || status === "Failed" ? "danger" : "neutral";
  return <Badge tone={tone}>{t(`userStatus.${status}`)}</Badge>;
}

export function ReconStatusBadge({ status }: { status: S<"ReconciliationStatus"> }) {
  const { t } = useI18n();
  const tone =
    status === "Matched" || status === "AdminResolved" || status === "ExplainableDifference" ? "success" : status === "AdminRequired" ? "danger" : "warning";
  return <Badge tone={tone}>{t(`reconStatus.${status}`)}</Badge>;
}
