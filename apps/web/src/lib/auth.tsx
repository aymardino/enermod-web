"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError, type User } from "@/lib/api";

export function useMe() {
  return useQuery<User | null>({
    queryKey: ["me"],
    // /auth/session answers 200 for visitors too (no console noise); /auth/me stays for scripts.
    queryFn: async () => {
      try {
        const r = await api.get<{ user: User | null }>("/auth/session");
        return r.user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: 60_000,
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return async () => {
    await api.post("/auth/logout");
    qc.setQueryData(["me"], null);
    qc.clear();
  };
}

export const isCurator = (u: User | null | undefined) => !!u && (u.role === "curator" || u.role === "admin");
