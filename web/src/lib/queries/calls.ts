import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CallRow } from "@/lib/types";

export interface CallFilters {
  from?: string; // ISO
  to?: string; // ISO
  direction?: CallRow["direction"];
  deviceId?: string;
  memberUserId?: string;
  phoneNumber?: string;
  hasRecording?: boolean;
  hasTranscript?: boolean;
}

function applyFilters(query: any, f: CallFilters) {
  if (f.from) query = query.gte("started_at", f.from);
  if (f.to) query = query.lte("started_at", f.to);
  if (f.direction) query = query.eq("direction", f.direction);
  if (f.deviceId) query = query.eq("device_id", f.deviceId);
  if (f.memberUserId) query = query.eq("user_id", f.memberUserId);
  if (f.phoneNumber) query = query.ilike("phone_number", `%${f.phoneNumber}%`);
  if (f.hasRecording) query = query.not("recording_storage_path", "is", null);
  if (f.hasTranscript) query = query.eq("transcription_status", "done");
  return query;
}

export function useCalls(filters: CallFilters = {}, limit = 50) {
  return useQuery<CallRow[]>({
    queryKey: ["calls", filters, limit],
    queryFn: async () => {
      let q = supabase
        .from("calls")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(limit);
      q = applyFilters(q, filters);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CallRow[];
    },
  });
}

export function useCall(id: string | undefined) {
  return useQuery<CallRow | null>({
    queryKey: ["call", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as CallRow | null;
    },
  });
}

export function useTodayStats(companyId: string | undefined) {
  return useQuery({
    queryKey: ["today-stats", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("calls")
        .select("direction, duration_sec, started_at, phone_number")
        .eq("company_id", companyId!)
        .gte("started_at", start.toISOString());
      if (error) throw error;
      const rows = (data ?? []) as Pick<
        CallRow,
        "direction" | "duration_sec" | "started_at" | "phone_number"
      >[];
      const counts = {
        incoming: 0,
        outgoing: 0,
        missed: 0,
        rejected: 0,
        total: rows.length,
        engagementSec: 0,
        avgDurationSec: 0,
      };
      let durSum = 0;
      const hourly = new Array(24).fill(0);
      const numberMap = new Map<string, number>();
      for (const r of rows) {
        if (r.direction && r.direction in counts) {
          (counts as Record<string, number>)[r.direction] += 1;
        }
        durSum += r.duration_sec ?? 0;
        const h = new Date(r.started_at).getHours();
        hourly[h] += 1;
        const num = r.phone_number ?? "unknown";
        numberMap.set(num, (numberMap.get(num) ?? 0) + 1);
      }
      counts.engagementSec = durSum;
      counts.avgDurationSec = rows.length ? Math.round(durSum / rows.length) : 0;
      const topNumbers = [...numberMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([number, count]) => ({ number, count }));
      return { counts, hourly, topNumbers };
    },
  });
}
