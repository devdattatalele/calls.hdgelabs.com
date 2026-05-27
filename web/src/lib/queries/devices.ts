import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { DeviceRow } from "@/lib/types";

export function useDevices(companyId: string | undefined) {
  return useQuery<DeviceRow[]>({
    queryKey: ["devices", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("devices")
        .select("*")
        .eq("company_id", companyId!)
        .order("last_synced_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as DeviceRow[];
    },
  });
}
