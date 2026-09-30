import Link from "next/link";
import { RequireAuth } from "@/components/require-auth";
import { serverI18n } from "@/lib/i18n/server";

/** Separate admin portal (04 §2): master-data editing never appears in investor screens. */
export default async function AdminLayout({ children, params }: LayoutProps<"/[lang]/admin">) {
  const { locale, t } = await serverI18n(params);
  const links = [
    ["", "admin.overview"],
    ["/data-sources", "admin.dataSources"],
    ["/rules", "admin.rules"],
    ["/reconciliation", "admin.reconciliation"],
    ["/models", "admin.models"],
    ["/operations", "admin.operations"],
  ] as const;
  return (
    <RequireAuth admin>
      <div className="flex flex-col gap-4 md:flex-row">
        <nav aria-label={t("nav.admin")} className="flex gap-2 overflow-x-auto md:w-56 md:flex-col">
          {links.map(([p, k]) => (
            <Link key={p} href={`/${locale}/admin${p}`} className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-muted hover:text-text">
              {t(k)}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </RequireAuth>
  );
}
