import createClient, { type Middleware } from "openapi-fetch";
import type { components, paths } from "./schema";

export type Schemas = components["schemas"];
export type S<K extends keyof Schemas> = Schemas[K];

/** RFC 9457 problem returned by the BE (doc 10 §4). */
export interface Problem {
  status: number;
  code: string;
  messageKey?: string;
  retryable?: boolean;
  correlationId?: string;
  fieldErrors?: { field: string; code: string }[];
  details?: unknown;
}

export class ApiError extends Error {
  constructor(public readonly problem: Problem) {
    super(problem.code);
    this.name = "ApiError";
  }
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
let csrfToken: string | null = null;

async function fetchCsrf(): Promise<string> {
  const res = await fetch("/api/v1/auth/csrf", { credentials: "include" });
  if (!res.ok) {
    throw new ApiError({ status: res.status, code: "NETWORK" });
  }

  csrfToken = ((await res.json()) as { token: string }).token;
  return csrfToken;
}

/** Forget the cached token (after login/logout the antiforgery identity changes). */
export function resetCsrf() {
  csrfToken = null;
}

const csrfMiddleware: Middleware = {
  async onRequest({ request }) {
    if (UNSAFE.has(request.method)) {
      request.headers.set("X-CSRF-TOKEN", csrfToken ?? (await fetchCsrf()));
    }

    return request;
  },
};

/** Browser client: same-origin `/api` rewrite keeps the session cookie first-party (C4). */
export const api = createClient<paths>({ baseUrl: "/api", credentials: "include" });
api.use(csrfMiddleware);

export async function toProblem(response: Response): Promise<Problem> {
  try {
    const body = (await response.clone().json()) as Partial<Problem>;
    return { status: response.status, code: body.code ?? "INTERNAL_ERROR", ...body };
  } catch {
    return { status: response.status, code: response.status === 0 ? "NETWORK" : "INTERNAL_ERROR" };
  }
}

/**
 * Unwraps an openapi-fetch result, throwing {@link ApiError}. A rejected CSRF token is refreshed once and the
 * request retried — the retried call is idempotent from the server's point of view because it was rejected.
 */
export async function call<T>(run: () => Promise<{ data?: T; error?: unknown; response: Response }>): Promise<T> {
  let result = await run();
  if (!result.response.ok && result.response.status === 403) {
    const problem = await toProblem(result.response);
    if (problem.code === "CSRF_TOKEN_INVALID") {
      resetCsrf();
      await fetchCsrf();
      result = await run();
    }
  }

  if (!result.response.ok) {
    throw new ApiError(await toProblem(result.response));
  }

  return result.data as T;
}

/** Multipart upload helper (openapi-fetch does not model IFormFile well). */
export async function uploadFile(file: File, purpose: S<"FilePurpose">): Promise<S<"FileDto">> {
  const form = new FormData();
  form.append("file", file);
  form.append("purpose", purpose);
  const send = async () =>
    fetch("/api/v1/files", { method: "POST", body: form, credentials: "include", headers: { "X-CSRF-TOKEN": csrfToken ?? (await fetchCsrf()) } });
  let res = await send();
  if (res.status === 403 && (await toProblem(res)).code === "CSRF_TOKEN_INVALID") {
    resetCsrf();
    res = await send();
  }

  if (!res.ok) {
    throw new ApiError(await toProblem(res));
  }

  return (await res.json()) as S<"FileDto">;
}
