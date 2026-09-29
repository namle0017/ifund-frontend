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
    `rounded-full px-3 py-1.5 text-[15px] transition-colors hover:text-text ${pathname === href(p) || pathname.startsWith(href(p) + "/") ? "font-normal text-text bg-surface-muted" : "text-text-secondary"}`;
  const hasMesh = pathname === href("") || pathname.startsWith(href("/auth"));
  const inApp = pathname === href("/app") || pathname.startsWith(href("/app") + "/");
  const isActive = (p: string, exact = false) => pathname === href(p) || (!exact && pathname.startsWith(href(p) + "/"));
  const subLinkClass = (p: string, exact = false) =>
    `whitespace-nowrap rounded-full px-3 py-1.5 text-sm transition-colors ${isActive(p, exact) ? "bg-info-bg text-primary" : "text-text-secondary hover:bg-surface-muted hover:text-text"}`;

  return (
    <div className="relative flex min-h-screen flex-col">
      {hasMesh && <div aria-hidden className="mesh" />}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2">
        {t("nav.skipToContent")}
      </a>
      <header className={`z-30 ${hasMesh ? "relative" : "sticky top-0 border-b border-border bg-surface/85 backdrop-blur"}`}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 md:px-6 md:py-4">
          <Link href={href("")} className="mr-2 text-xl font-medium tracking-tight text-text">
            {PRODUCT_NAME}
          </Link>
          <button className="btn btn-secondary ml-auto md:hidden" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpen((v) => !v)}>
            {t("nav.menu")}
          </button>
          <nav id="main-nav" aria-label={t("nav.menu")} className={`${open ? "flex" : "hidden"} w-full flex-col gap-1 md:flex md:w-auto md:flex-row md:items-center`}>
            {publicLinks.map(([p, k]) => (
              <Link key={p} href={href(p)} className={linkClass(p)} onClick={() => setOpen(false)}>
                {t(k)}
              </Link>
            ))}
            {me && (
              <Link href={href("/app")} className={linkClass("/app")} onClick={() => setOpen(false)}>
                {t("nav.dashboard")}
              </Link>
            )}
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
            <select id="locale-switch" value={locale} onChange={(e) => switchLocale(e.target.value as Locale)} className="field min-h-9 rounded-full py-1 text-sm">
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
              <Link href={`${href("/auth/login")}?returnUrl=${encodeURIComponent(pathname)}`} className="btn btn-primary">
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
        {me && inApp && (
          // Investor workspace sub-navigation: keeps the global bar to one line (DESIGN-stripe nav-bar).
          <nav aria-label={t("nav.portfolios")} className="border-t border-border">
            <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-2 md:px-6">
              {investorLinks.map(([p, k]) => (
                <Link key={p} href={href(p)} aria-current={isActive(p, p === "/app") ? "page" : undefined} className={subLinkClass(p, p === "/app")}>
                  {t(k)}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>
      <main id="main" className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 py-8 pb-24 md:px-6 md:py-10 md:pb-12">
        {children}
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-[13px] text-text-muted md:px-6 md:py-16">
          <p className="text-base font-medium text-text">{PRODUCT_NAME}</p>
          <Disclaimer />
        </div>
      </footer>
      {me && (
        // Mobile bottom navigation for core investor areas (04 §10).
        <nav aria-label={t("nav.dashboard")} className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-surface/95 py-2 backdrop-blur md:hidden">
          {(["/app", "/calculator", "/app/plans", "/app/alerts"] as const).map((p) => (
            <Link key={p} href={href(p)} className={`flex min-h-11 items-center rounded-full px-3 text-xs ${pathname === href(p) ? "bg-info-bg text-primary" : "text-text-secondary"}`}>
              {t({ "/app": "nav.dashboard", "/calculator": "nav.calculator", "/app/plans": "nav.plans", "/app/alerts": "nav.alerts" }[p])}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
