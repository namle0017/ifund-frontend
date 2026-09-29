"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n/client";
import { isAdmin, useMe } from "@/lib/session";
import { ErrorState } from "./data";
import { Alert, Loading } from "./ui";

/** UX guard only — the BE enforces every permission (04 §5, 07 §5). */
export function RequireAuth({ admin, children }: { admin?: boolean; children: ReactNode }) {
  const { t, locale } = useI18n();
  const { data: me, isPending, error } = useMe();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && !error && me === null) {
      router.replace(`/${locale}/auth/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [me, isPending, error, router, locale, pathname]);

  if (isPending || me === null) {
    return <Loading label={t("common.loading")} />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  if (admin && !isAdmin(me)) {
    return <Alert tone="danger">{t("errors.FORBIDDEN")}</Alert>;
  }

  return <>{children}</>;
}
