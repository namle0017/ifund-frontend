"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { PRODUCT_NAME, type Locale } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { isAdmin, useSessionActions, type Me } from "@/lib/session";

/**
 * Signed-in top bar: solid brand band with white links and an avatar menu for the less frequent investor areas.
 * Guests keep the light Stripe-style bar in AppShell.
 */
export function AccountHeader({ me }: { me: Me }) {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useSessionActions();
  const [navOpen, setNavOpen] = useState(false);
  const href = (p: string) => `/${locale}${p}`;
  const active = (p: string, exact = false) => pathname === href(p) || (!exact && pathname.startsWith(href(p) + "/"));

  const links: [string, string, boolean?][] = [
    ["/funds", "nav.funds"],
    ["/compare", "nav.compare"],
    ["/calculator", "nav.calculator"],
    ["/app", "nav.assets", true],
    ["/app/plans", "nav.plans"],
  ];
  if (isAdmin(me)) {
    links.push(["/admin", "nav.admin"]);
  }

  // "Quản lý tài sản" stays highlighted on its sub-pages that are not in the bar (portfolios, transactions…).
  const assetsActive = active("/app") && !active("/app/plans");

  return (
    <header className="sticky top-0 z-30 bg-nav text-nav-text shadow-float">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 md:px-6">
        <Link href={href("")} className="mr-4 text-2xl font-semibold tracking-tight">
          {PRODUCT_NAME}
        </Link>
        <button
          className="btn ml-auto border-white/60 text-nav-text hover:bg-white/10 md:hidden"
          aria-expanded={navOpen}
          aria-controls="main-nav"
          onClick={() => setNavOpen((v) => !v)}
        >
          {t("nav.menu")}
        </button>
        <nav id="main-nav" aria-label={t("nav.menu")} className={`${navOpen ? "flex" : "hidden"} order-last w-full flex-col md:order-none md:flex md:w-auto md:flex-row md:items-center`}>
          {links.map(([p, k, exact]) => {
            const on = p === "/app" ? assetsActive : active(p, exact);
            return (
              <Link
                key={p}
                href={href(p)}
                aria-current={on ? "page" : undefined}
                onClick={() => setNavOpen(false)}
                className={`relative rounded-full px-3 py-2 text-[16px] transition-colors hover:bg-white/10 ${on ? "font-medium text-nav-active" : "text-nav-text"}`}
              >
                {t(k)}
              </Link>
            );
          })}
        </nav>
        <AccountMenu
          me={me}
          onLogout={async () => {
            await logout();
            router.push(href(""));
          }}
          onLocale={(next) => router.push(pathname.replace(/^\/(vi|en)/, `/${next}`))}
        />
      </div>
    </header>
  );
}

function AccountMenu({ me, onLogout, onLocale }: { me: Me; onLogout: () => Promise<void>; onLocale: (l: Locale) => void }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const href = (p: string) => `/${locale}${p}`;
  const name = me.displayName || me.email || "";
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) {
      return;
    }

    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: [string, string][] = [
    ["/app/alerts", "nav.alerts"],
    ["/app/distributions", "nav.distributions"],
    ["/app/reports", "nav.reports"],
    ["/methodology", "nav.methodology"],
    ["/app/settings", "nav.settings"],
  ];

  return (
    <div ref={ref} className="relative md:ml-auto">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={t("nav.accountMenu")}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ffd84d] text-lg font-semibold text-[#1c1e54] ring-2 ring-white/70 transition hover:ring-white"
      >
        {initial}
      </button>
      {open && (
        <div id={menuId} className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border bg-surface-raised text-text shadow-float">
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs text-text-muted">{t("nav.account")}</p>
            <p className="truncate text-sm font-medium">{name}</p>
          </div>
          <ul className="py-1">
            {items.map(([p, k]) => (
              <li key={p}>
                <Link href={href(p)} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm hover:bg-surface-muted">
                  {t(k)}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <label htmlFor={`${menuId}-lang`} className="text-sm text-text-secondary">
              {t("common.language")}
            </label>
            <select id={`${menuId}-lang`} value={locale} onChange={(e) => onLocale(e.target.value as Locale)} className="field min-h-9 py-1 text-sm">
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
          <button type="button" onClick={() => void onLogout()} className="block w-full border-t border-border px-4 py-3 text-left text-sm text-danger hover:bg-danger-bg">
            {t("nav.logout")}
          </button>
        </div>
      )}
    </div>
  );
}
