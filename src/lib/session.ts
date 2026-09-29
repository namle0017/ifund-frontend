"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api, call, resetCsrf, type S } from "./api/client";

export type Me = { id: string; email?: string | null; displayName?: string | null; locale: string; roles: string[]; hasPassword: boolean; googleLinked: boolean; stepUpFresh: boolean };

/** Session state comes from the BE only; FE role checks are UX hints, the BE always enforces (07 §5). */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      try {
        return (await call(() => api.GET("/v1/auth/me"))) as unknown as Me;
      } catch (e) {
        if (e instanceof ApiError && e.problem.status === 401) {
          return null;
        }

        throw e;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
}

export const isAdmin = (me: Me | null | undefined) => !!me && (me.roles.includes("DataAdmin") || me.roles.includes("ModelAdmin"));

export function useSessionActions() {
  const qc = useQueryClient();
  return {
    async login(body: S<"LoginRequest">) {
      await call(() => api.POST("/v1/auth/login", { body }));
      resetCsrf();
      await qc.invalidateQueries();
    },
    async logout() {
      await call(() => api.POST("/v1/auth/logout"));
      resetCsrf();
      qc.clear();
    },
    async stepUp(password: string) {
      await call(() => api.POST("/v1/auth/step-up", { body: { password } }));
      resetCsrf();
      await qc.invalidateQueries({ queryKey: ["me"] });
    },
  };
}
