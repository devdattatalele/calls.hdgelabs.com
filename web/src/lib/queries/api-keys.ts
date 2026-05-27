import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import type { ApiKeyRow } from "@/lib/types";

export function useApiKeys(companyId: string | undefined) {
  return useQuery<ApiKeyRow[]>({
    queryKey: ["api-keys", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ApiKeyRow[];
    },
  });
}

export function useMintApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      rate_limit_per_min?: number;
      monthly_minutes_limit?: number;
    }) =>
      api.post<{ id: string; prefix: string; key: string }>("/v1/keys", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => api.delete(`/v1/keys/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });
}
