"use client";

import Link from "next/link";
import { useState } from "react";
import { ErrorState } from "@/components/data";
import { Alert, Button, Card, Field, TextInput } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";
import { meetsPasswordHint } from "@/lib/auth-utils";


/** SF-10 — registration; response is the same whether or not the email exists (no enumeration). */
export default function RegisterPage() {
  const { t, locale } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const weak = password.length > 0 && !meetsPasswordHint(password);

  if (done) {
    return (
      <Card title={t("auth.registerTitle")} className="mx-auto w-full max-w-md shadow-float md:mt-10">
        <Alert tone="success" live>
          {t("auth.registered")}
        </Alert>
      </Card>
    );
  }

  return (
    <Card title={t("auth.registerTitle")} className="mx-auto w-full max-w-md shadow-float md:mt-10">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await call(() => api.POST("/v1/auth/register", { body: { email, password, displayName: name || null, locale } }));
            setDone(true);
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label={t("auth.displayName")}>{(id) => <TextInput id={id} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label={t("auth.email")}>{(id) => <TextInput id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label={t("auth.password")} hint={t("auth.passwordRules")} error={weak ? t("auth.passwordRules") : null}>
          {(id, d) => <TextInput id={id} aria-describedby={d} invalid={weak} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        {error ? <ErrorState error={error} /> : null}
        <Button type="submit" busy={busy} disabled={weak}>
          {t("auth.submitRegister")}
        </Button>
      </form>
      <p className="mt-3 text-sm">
        {t("auth.haveAccount")}{" "}
        <Link href={`/${locale}/auth/login`} className="text-primary">
          {t("auth.submitLogin")}
        </Link>
      </p>
    </Card>
  );
}
