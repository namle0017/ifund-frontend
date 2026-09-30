import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Providers } from "@/components/providers";
import { isLocale, locales, PRODUCT_NAME } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import "../globals.css";

/** Inter (open-source analogue of Sohne per DESIGN-stripe.md); vietnamese subset for diacritics. */
const inter = Inter({ subsets: ["latin", "vietnamese"], weight: ["300", "400", "500", "600"], variable: "--font-inter", display: "swap" });

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
    <html lang={lang} className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full">
        <Providers locale={lang}>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
