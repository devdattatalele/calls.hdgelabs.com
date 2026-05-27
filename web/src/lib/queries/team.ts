import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import type { CompanyMemberRow } from "@/lib/types";

export function useTeam(companyId: string | undefined) {
  return useQuery<CompanyMemberRow[]>({
    queryKey: ["team", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompanyMemberRow[];
    },
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string; label?: string }) => {
      return api.post<{ user_id: string }>("/v1/team/members", input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });
}

export function useResetMemberPassword() {
  return useMutation({
    mutationFn: async (input: { user_id: string; password: string }) =>
      api.post(`/v1/team/members/${input.user_id}/reset-password`, {
        password: input.password,
      }),
  });
}

export function useDeactivateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) =>
      api.post(`/v1/team/members/${user_id}/deactivate`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
