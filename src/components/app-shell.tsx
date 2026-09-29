"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { PRODUCT_NAME, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { isAdmin, useMe, useSessionActions } from "@/lib/session";
import { Disclaimer } from "./data";
import { Button } from "./ui";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();
  const { logout } = useSessionActions();
  const [open, setOpen] = useState(false);
  const href = (p: string) => `/${locale}${p}`;

  const publicLinks = [
    ["/funds", "nav.funds"],
    ["/compare", "nav.compare"],
    ["/calculator", "nav.calculator"],
    ["/methodology", "nav.methodology"],
  ] as const;
  const investorLinks = [
    ["/app", "nav.dashboard"],
    ["/app/plans", "nav.plans"],
    ["/app/distributions", "nav.distributions"],
    ["/app/alerts", "nav.alerts"],
    ["/app/reports", "nav.reports"],
    ["/app/settings", "nav.settings"],
  ] as const;

  const switchLocale = (next: Locale) => router.push(pathname.replace(/^\/(vi|en)/, `/${next}`));
  const linkClass = (p: string) =>
    `rounded px-2 py-1 text-sm hover:bg-surface-muted ${pathname === href(p) || pathname.startsWith(href(p) + "/") ? "font-semibold text-primary" : ""}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:p-2">
        {t("nav.skipToContent")}
      </a>
      <header className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href={href("")} className="text-lg font-bold text-primary">
            {PRODUCT_NAME}
          </Link>
          <button className="ml-auto rounded border border-border px-2 py-1 text-sm md:hidden" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((v) => !v)}>
            {t("nav.menu")}
          </button>
          <nav id="main-nav" aria-label={t("nav.menu")} className={`${open ? "flex" : "hidden"} w-full flex-col gap-1 md:flex md:w-auto md:flex-row md:items-center`}>
            {publicLinks.map(([p, k]) => (
              <Link key={p} href={href(p)} className={linkClass(p)} onClick={() => setOpen(false)}>
                {t(k)}
              </Link>
            ))}
            {me &&
              investorLinks.map(([p, k]) => (
                <Link key={p} href={href(p)} className={linkClass(p)} onClick={() => setOpen(false)}>
                  {t(k)}
                </Link>
              ))}
            {isAdmin(me) && (
              <Link href={href("/admin")} className={linkClass("/admin")} onClick={() => setOpen(false)}>
                {t("nav.admin")}
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2 md:ml-auto">
            <label className="sr-only" htmlFor="locale-switch">
              {t("common.language")}
            </label>
            <select id="locale-switch" value={locale} onChange={(e) => switchLocale(e.target.value as Locale)} className="rounded border border-border bg-surface px-2 py-1 text-sm">
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
            {me ? (
              <Button
                variant="secondary"
                onClick={async () => {
                  await logout();
                  router.push(href(""));
                }}
              >
                {t("nav.logout")}
              </Button>
            ) : (
              <Link href={`${href("/auth/login")}?returnUrl=${encodeURIComponent(pathname)}`} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-contrast">
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <Disclaimer />
        </div>
      </footer>
      {me && (
        // Mobile bottom navigation for core investor areas (04 §10).
        <nav aria-label={t("nav.dashboard")} className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-surface-raised py-2 md:hidden">
          {(["/app", "/calculator", "/app/plans", "/app/alerts"] as const).map((p) => (
            <Link key={p} href={href(p)} className="px-2 text-xs">
              {t({ "/app": "nav.dashboard", "/calculator": "nav.calculator", "/app/plans": "nav.plans", "/app/alerts": "nav.alerts" }[p])}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
