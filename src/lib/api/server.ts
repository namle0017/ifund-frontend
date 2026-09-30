import "server-only";
import createClient from "openapi-fetch";
import type { paths } from "./schema";

/**
 * Server Component client for public catalog data (SSR/SEO, 07 §3). Talks to the BE directly; never forwards user
 * cookies, so it is only used for guest-accessible endpoints.
 */
export const serverApi = createClient<paths>({
  baseUrl: process.env.BE_URL ?? "http://127.0.0.1:5080",
  // Public data is cached briefly; the UI always shows the data timestamp (NFR-UX-002).
  next: { revalidate: 60 },
} as Parameters<typeof createClient<paths>>[0]);

/**
 * FR-DATA-004 / 04 §9: a BE outage must render an explicit "unavailable" state, never crash the page or show zeros.
 * Returns `null` data with `unavailable: true` when the BE cannot be reached.
 */
export async function safely<T>(run: () => Promise<{ data?: T; response: Response }>): Promise<{ data: T | null; status: number; unavailable: boolean }> {
  try {
    const { data, response } = await run();
    return { data: response.ok ? (data ?? null) : null, status: response.status, unavailable: response.status >= 500 };
  } catch {
    return { data: null, status: 0, unavailable: true };
  }
}
