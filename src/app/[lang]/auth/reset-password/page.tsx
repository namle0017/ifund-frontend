"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ErrorState } from "@/components/data";
import { Alert, Button, Card, Field, TextInput } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

function ResetInner() {
  const { t } = useI18n();
  const params = useSearchParams();
  const userId = params.get("userId");
  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (run: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setError(null);
    try {
      await run();
      setMessage(success);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title={t("auth.resetTitle")} className="mx-auto w-full max-w-md">
      {message ? (
        <Alert tone="success" live>
          {message}
        </Alert>
      ) : userId && token ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(() => call(() => api.POST("/v1/auth/reset-password", { body: { userId, token, newPassword: password } })), t("auth.resetDone"));
          }}
        >
          <Field label={t("auth.newPassword")} hint={t("auth.passwordRules")}>
            {(id, d) => <TextInput id={id} aria-describedby={d} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          {error ? <ErrorState error={error} /> : null}
          <Button type="submit" busy={busy}>
            {t("common.confirm")}
          </Button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(() => call(() => api.POST("/v1/auth/forgot-password", { body: { email } })), t("auth.resetSent"));
          }}
        >
          <Field label={t("auth.email")}>{(id) => <TextInput id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          {error ? <ErrorState error={error} /> : null}
          <Button type="submit" busy={busy}>
            {t("auth.sendReset")}
          </Button>
        </form>
      )}
    </Card>
  );
}

/** SF-11 — forgot/reset password; identical response whether or not the email exists. */
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetInner />
    </Suspense>
  );
}
