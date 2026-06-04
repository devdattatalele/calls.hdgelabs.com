import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Copy, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCall } from "@/lib/queries/calls";
import { useTranscribe } from "@/lib/queries/transcription";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DirectionBadge } from "@/components/DirectionBadge";
import { WaveformPlayer } from "@/components/WaveformPlayer";
import { ConfidenceBadge, RatingPill } from "@/components/ConfidenceBadge";
import { TranscriptView } from "@/components/TranscriptView";
import { formatDuration } from "@/lib/utils";

export function CallDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: call, isLoading } = useCall(id);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const transcribe = useTranscribe();
  const qc = useQueryClient();

  // While a transcription is in flight, poll the call row every 5s so the UI
  // flips pending → processing → done without a manual refresh.
  useEffect(() => {
    if (!call?.id) return;
    const live =
      call.transcription_status === "pending" ||
      call.transcription_status === "processing";
    if (!live) return;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["call", call.id] });
    }, 5000);
    return () => clearInterval(t);
  }, [call?.id, call?.transcription_status, qc]);

  useEffect(() => {
    if (!call?.id || !call.recording_storage_path) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    api
      .get<{ url: string }>(`/v1/dashboard/recordings/sign?call_id=${call.id}`)
      .then((res) => !cancelled && setSignedUrl(res.url))
      .catch((e) => toast.error(e.message ?? "Could not load recording"));
    return () => {
      cancelled = true;
    };
  }, [call?.id, call?.recording_storage_path]);

  if (isLoading || !call) {
    return (
      <>
        <PageHeader title="Call detail" />
        <div className="p-8">
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  async function copyShare() {
    if (!signedUrl) return;
    await navigator.clipboard.writeText(signedUrl);
    toast.success("Share link copied (valid 10 min)");
  }

  function onTranscribe() {
    if (!call) return;
    transcribe.mutate(
      { call_ids: [call.id] },
      {
        onSuccess: (resp) => {
          if (resp.queued > 0) toast.success("Transcription queued");
          else if (resp.skipped[0]) toast.info(`Skipped: ${resp.skipped[0].reason}`);
        },
        onError: (e) => toast.error(e.message ?? "Could not queue transcription"),
      },
    );
  }

  const status = call.transcription_status;
  const transcribeDisabled =
    !call.recording_storage_path ||
    status === "pending" ||
    status === "processing" ||
    transcribe.isPending;
  const transcribeLabel =
    status === "pending"
      ? "Queued…"
      : status === "processing"
        ? "Transcribing…"
        : status === "done"
          ? "Re-transcribe"
          : status === "failed"
            ? "Retry"
            : "Transcribe";
  const showTranscribeButton = status !== "done"; // re-transcribe deferred (see backend)

  return (
    <>
      <PageHeader
        title={call.phone_number ?? "unknown"}
        description={format(new Date(call.started_at), "EEE d MMM yyyy, HH:mm")}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/calls">
              <ArrowLeft className="h-4 w-4" /> Back to calls
            </Link>
          </Button>
        }
      />
      <div className="grid gap-4 p-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle>Recording</CardTitle>
              <div className="flex items-center gap-2">
                {showTranscribeButton && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onTranscribe}
                    disabled={transcribeDisabled}
                  >
                    {status === "pending" || status === "processing" || transcribe.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FileText className="h-3.5 w-3.5" />
                    )}
                    {transcribeLabel}
                  </Button>
                )}
                {signedUrl && (
                  <Button variant="outline" size="sm" onClick={copyShare}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy share link
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!call.recording_storage_path ? (
                <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
                  No recording attached to this call.
                </div>
              ) : !signedUrl ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <WaveformPlayer url={signedUrl} />
              )}
            </CardContent>
          </Card>

          {status !== "skipped" && (
            <Card>
              <CardHeader>
                <CardTitle>Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <TranscriptView call={call} />
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <DetailRow label="Direction" value={<DirectionBadge direction={call.direction} />} />
            <DetailRow label="Duration" value={formatDuration(call.duration_sec)} />
            <DetailRow label="Started" value={format(new Date(call.started_at), "PPpp")} />
            {(call.assigned_contact_name || call.contact_name) && (
              <DetailRow
                label="Contact"
                value={call.assigned_contact_name ?? call.contact_name}
              />
            )}
            {call.assigned_contact_phone && (
              <DetailRow label="Contact phone" value={call.assigned_contact_phone} />
            )}
            <DetailRow label="Rating" value={<RatingPill value={call.rating} />} />
            <DetailRow
              label="Confidence"
              value={<ConfidenceBadge value={call.purchase_confidence} />}
            />
            {call.rated_at && (
              <DetailRow
                label="Rated at"
                value={format(new Date(call.rated_at), "MMM d, HH:mm")}
              />
            )}
            <DetailRow label="Device" value={<code className="text-xs">{call.device_id.slice(0, 8)}…</code>} />
            <DetailRow label="Team member" value={<code className="text-xs">{call.user_id.slice(0, 8)}…</code>} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div>{value}</div>
    </div>
  );
}
