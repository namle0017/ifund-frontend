"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Alert, Card } from "@/components/ui";
import { useI18n } from "@/lib/i18n/client";

function CallbackInner() {
  const { t, locale } = useI18n();
  const error = useSearchParams().get("error");
  return (
    <Card title={t("auth.callbackTitle")} className="mx-auto w-full max-w-md">
      {error ? (
        <Alert tone={error === "ACCOUNT_EXISTS_LINK_REQUIRED" ? "warning" : "danger"}>{t(`errors.${error}`, t("common.error"))}</Alert>
      ) : (
        <Alert tone="success">OK</Alert>
      )}
      <Link href={`/${locale}/auth/login`} className="mt-3 inline-block text-sm text-primary underline">
        {t("auth.submitLogin")}
      </Link>
    </Card>
  );
}

/** SF-13 — Google OAuth result/errors. C5: an existing email account is never auto-linked. */
export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
