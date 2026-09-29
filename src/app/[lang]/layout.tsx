import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { isLocale, locales, PRODUCT_NAME } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import "../globals.css";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    return {};
  }

  return { title: { default: PRODUCT_NAME, template: `%s · ${PRODUCT_NAME}` }, description: getDictionary(lang).home.subtitle };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }

  return (
    <html lang={lang} className="h-full antialiased">
      <body className="min-h-full">
        <Providers locale={lang}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
