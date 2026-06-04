import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface TranscribeResponse {
  queued: number;
  skipped: { id: string; reason: string }[];
}

export interface WorkerHealth {
  ok: boolean;
  provider?: string;
  started_at?: string;
  last_pass_at?: string | null;
  jobs_in_flight?: number;
  jobs_done_today?: number;
  jobs_failed_today?: number;
  last_error?: string | null;
  reason?: string;
}

export function useTranscribe() {
  const qc = useQueryClient();
  return useMutation<TranscribeResponse, Error, { call_ids: string[] }>({
    mutationFn: (input) =>
      api.post<TranscribeResponse>("/v1/dashboard/transcribe", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["call"] });
    },
  });
}

export function useWorkerHealth() {
  return useQuery<WorkerHealth>({
    queryKey: ["transcriber-health"],
    queryFn: () => api.get<WorkerHealth>("/v1/dashboard/transcribe/health"),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
