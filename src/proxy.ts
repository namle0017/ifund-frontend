import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, isLocale } from "@/lib/i18n/config";

/** B2: every page lives under /{vi|en}/…; paths without a locale are redirected (preferring the Accept-Language header). */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";
  if (isLocale(first)) {
    return;
  }

  const preferred = request.headers.get("accept-language")?.toLowerCase().startsWith("en") ? "en" : defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${preferred}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API proxying, Next internals and static files.
  matcher: ["/((?!api|_next|favicon.ico|.*\\..*).*)"],
};
