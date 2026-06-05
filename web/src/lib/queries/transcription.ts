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

export function useClearTranscript() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (callId) =>
      api.post<{ ok: boolean }>(`/v1/dashboard/calls/${callId}/clear-transcript`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["call"] });
    },
  });
}

export function useDeleteCall() {
  const qc = useQueryClient();
  return useMutation<{ ok: boolean }, Error, string>({
    mutationFn: (callId) =>
      api.delete<{ ok: boolean }>(`/v1/dashboard/calls/${callId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calls"] });
      qc.invalidateQueries({ queryKey: ["call"] });
    },
  });
}

export interface TestUploadResponse {
  call_id: string;
  storage_path: string;
  filename: string;
  size_bytes: number;
}

export function useTestUpload() {
  const qc = useQueryClient();
  return useMutation<TestUploadResponse, Error, File>({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append("file", file, file.name);
      return api.upload<TestUploadResponse>(
        "/v1/dashboard/test-upload",
        form,
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calls"] }),
  });
}
