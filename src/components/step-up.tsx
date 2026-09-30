"use client";

import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";
import { useMe, useSessionActions } from "@/lib/session";
import { ErrorState } from "./data";
import { Alert, Button, Field, TextInput } from "./ui";

/** C10: approvals need a fresh password re-entry (valid 5 minutes); the BE enforces it with the StepUp policy. */
export function StepUpGate({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { data: me } = useMe();
  const { stepUp } = useSessionActions();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  if (me?.stepUpFresh) {
    return <>{children}</>;
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-lg border border-warning/40 bg-warning-bg p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await stepUp(password);
          setPassword("");
        } catch (err) {
          setError(err);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Alert tone="warning" title={t("auth.stepUpTitle")}>
        {t("auth.stepUpHint")}
      </Alert>
      <Field label={t("auth.password")}>{(id) => <TextInput id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
      {error ? <ErrorState error={error} /> : null}
      <Button type="submit" busy={busy}>
        {t("common.confirm")}
      </Button>
    </form>
  );
}

/** Reason + evidence inputs required for every master-data decision (SR-ADMIN-001). */
export function DecisionForm({ onSubmit, busy, actions }: { onSubmit: (reason: string, evidence: string, action: string) => void; busy?: boolean; actions: { key: string; label: string; variant?: "primary" | "danger" | "secondary" }[] }) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  return (
    <div className="flex flex-col gap-2">
      <Field label={t("common.reason")}>{(id) => <TextInput id={id} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>
      <Field label={t("common.evidence")}>{(id) => <TextInput id={id} value={evidence} onChange={(e) => setEvidence(e.target.value)} />}</Field>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.key} variant={a.variant ?? "primary"} busy={busy} disabled={!reason.trim()} onClick={() => onSubmit(reason, evidence, a.key)}>
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
