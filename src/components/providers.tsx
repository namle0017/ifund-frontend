"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/client";
import type { Locale } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n/client";

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Private data is never cached across sessions; retries only for retryable server errors.
          queries: { staleTime: 30_000, retry: (count, error) => count < 2 && !(error instanceof ApiError && error.problem.status < 500) },
          mutations: { retry: false },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <I18nProvider locale={locale}>{children}</I18nProvider>
    </QueryClientProvider>
  );
}
