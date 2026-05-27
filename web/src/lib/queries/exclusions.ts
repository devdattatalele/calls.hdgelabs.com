import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ExcludedNumberRow } from "@/lib/types";

export function useExclusions(companyId: string | undefined) {
  return useQuery<ExcludedNumberRow[]>({
    queryKey: ["exclusions", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("excluded_numbers")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExcludedNumberRow[];
    },
  });
}

export function useAddExclusion(companyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { phone_number: string; reason?: string }) => {
      const { error } = await supabase.from("excluded_numbers").insert({
        company_id: companyId,
        phone_number: input.phone_number,
        reason: input.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exclusions"] }),
  });
}

export function useRemoveExclusion(companyId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (phone_number: string) => {
      const { error } = await supabase
        .from("excluded_numbers")
        .delete()
        .eq("company_id", companyId)
        .eq("phone_number", phone_number);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exclusions"] }),
  });
}
