import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CompanyRow } from "@/lib/types";

export function useMyCompany(userId: string | undefined) {
  return useQuery<CompanyRow | null>({
    queryKey: ["company", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("owner_user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as CompanyRow | null;
    },
  });
}
