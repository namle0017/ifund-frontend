"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ErrorState } from "@/components/data";
import { Button, Card, Checkbox, Field, TextInput } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";
import { useSessionActions } from "@/lib/session";
import { safeReturn } from "@/lib/auth-utils";


function LoginInner() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useSessionActions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const returnUrl = safeReturn(params.get("returnUrl"), `/${locale}/app`);

  return (
    <Card title={t("auth.loginTitle")} className="mx-auto w-full max-w-md shadow-float md:mt-10">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await login({ email, password, rememberMe: remember });
            router.push(returnUrl);
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label={t("auth.email")}>{(id) => <TextInput id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label={t("auth.password")}>
          {(id) => <TextInput id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}
        </Field>
        <Checkbox label={t("auth.rememberMe")} checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        {error ? <ErrorState error={error} /> : null}
        <Button type="submit" busy={busy}>
          {t("auth.submitLogin")}
        </Button>
      </form>
      <a href={`/api/v1/auth/google/start?returnUrl=${encodeURIComponent(returnUrl)}`} className="btn btn-secondary mt-3 w-full">
        {t("auth.google")}
      </a>
      <div className="mt-4 flex flex-col gap-1 text-sm">
        <Link href={`/${locale}/auth/reset-password`} className="text-primary">
          {t("auth.forgot")}
        </Link>
        <span>
          {t("auth.noAccount")}{" "}
          <Link href={`/${locale}/auth/register`} className="text-primary">
            {t("auth.submitRegister")}
          </Link>
        </span>
      </div>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
