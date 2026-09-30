import { notFound } from "next/navigation";
import { isLocale, type Locale } from "./config";
import { getDictionary, translate } from "./dictionaries";

/** Resolves the route locale for Server Components and returns a translator bound to it. */
export async function serverI18n(params: Promise<{ lang: string }>): Promise<{ locale: Locale; t: (path: string, fallback?: string) => string }> {
  const { lang } = await params;
  if (!isLocale(lang)) {
    notFound();
  }

  const dict = getDictionary(lang);
  return { locale: lang, t: (path, fallback) => translate(dict, path, fallback) };
}
