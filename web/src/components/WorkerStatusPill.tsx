import { useWorkerHealth } from "@/lib/queries/transcription";
import { cn } from "@/lib/utils";

/**
 * Small rounded pill rendered on the Recordings + Transcripts pages so the
 * team manager can tell at a glance whether the local Whisper worker is
 * reachable. Reads the FastAPI proxy at /v1/dashboard/transcribe/health,
 * which fronts the Cloudflare-tunnelled worker on the user's Mac.
 */
export function WorkerStatusPill() {
  const { data, isLoading } = useWorkerHealth();

  const ok = !!data?.ok;
  const inFlight = data?.jobs_in_flight ?? 0;
  const doneToday = data?.jobs_done_today ?? 0;

  const dotClass = isLoading
    ? "bg-muted-foreground/40"
    : ok
      ? "bg-emerald-500"
      : "bg-red-500";

  const label = isLoading
    ? "Checking transcriber…"
    : ok
      ? inFlight > 0
        ? `Transcriber online · ${inFlight} in flight`
        : doneToday > 0
          ? `Transcriber online · ${doneToday} done today`
          : "Transcriber online"
      : data?.reason === "unreachable"
        ? "Transcriber offline"
        : `Transcriber: ${data?.reason ?? "unknown"}`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
        ok ? "border-emerald-500/30" : "border-red-500/30",
      )}
      title={data?.last_error ?? undefined}
    >
      <span className={cn("h-2 w-2 rounded-full", dotClass)} />
      <span>{label}</span>
    </div>
  );
}
