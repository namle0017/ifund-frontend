"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { ErrorState } from "@/components/data";
import { Alert, Card, Loading } from "@/components/ui";
import { api, call } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/client";

function VerifyInner() {
  const { t, locale } = useI18n();
  const params = useSearchParams();
  const [state, setState] = useState<"pending" | "ok" | { error: unknown }>("pending");
  const sent = useRef(false);

  useEffect(() => {
    const userId = params.get("userId");
    const token = params.get("token");
    if (sent.current || !userId || !token) {
      return;
    }

    sent.current = true;
    call(() => api.POST("/v1/auth/verify-email", { body: { userId, token } }))
      .then(() => setState("ok"))
      .catch((error: unknown) => setState({ error }));
  }, [params]);

  return (
    <Card title={t("auth.verifyTitle")} className="mx-auto w-full max-w-md">
      {state === "pending" ? (
        <Loading label={t("common.loading")} />
      ) : state === "ok" ? (
        <Alert tone="success" live>
          {t("auth.verified")}{" "}
          <Link href={`/${locale}/auth/login`} className="text-primary underline">
            {t("auth.submitLogin")}
          </Link>
        </Alert>
      ) : (
        <ErrorState error={state.error} />
      )}
    </Card>
  );
}

/** SF-10 — email verification link target. */
export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyInner />
    </Suspense>
  );
}
