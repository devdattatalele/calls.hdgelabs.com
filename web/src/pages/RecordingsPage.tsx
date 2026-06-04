import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, FileText, Loader2, Mic, Phone } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import { useCalls } from "@/lib/queries/calls";
import { useTeam } from "@/lib/queries/team";
import { useTranscribe } from "@/lib/queries/transcription";
import { PageHeader } from "@/components/PageHeader";
import {
  RecordingsFilters,
  type RecordingsFilterState,
} from "@/components/RecordingsFilters";
import { UsageDonut } from "@/components/UsageDonut";
import { PlaybackSheet } from "@/components/PlaybackSheet";
import { DirectionBadge } from "@/components/DirectionBadge";
import { ConfidenceBadge, RatingPill } from "@/components/ConfidenceBadge";
import { WorkerStatusPill } from "@/components/WorkerStatusPill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { confidenceBucket, confidenceLabel } from "@/lib/types";
import { buildCsv, downloadCsv } from "@/lib/csv";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import type { CallRow, TranscriptionStatus } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export function RecordingsPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const team = useTeam(company.data?.id);
  const [filters, setFilters] = useState<RecordingsFilterState>({});
  const [opened, setOpened] = useState<CallRow | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const transcribe = useTranscribe();
  const qc = useQueryClient();

  const apiFilters = useMemo(
    () => ({
      hasRecording: true,
      memberUserId: filters.memberUserId,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to + "T23:59:59").toISOString() : undefined,
      phoneNumber: filters.phone,
    }),
    [filters],
  );
  const calls = useCalls(apiFilters, 500);

  // While any visible row is mid-transcription, poll the calls list every 5s
  // so badges flip live.
  const hasLive = useMemo(
    () =>
      (calls.data ?? []).some(
        (c) =>
          c.transcription_status === "pending" ||
          c.transcription_status === "processing",
      ),
    [calls.data],
  );
  useEffect(() => {
    if (!hasLive) return;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["calls"] });
    }, 5000);
    return () => clearInterval(t);
  }, [hasLive, qc]);

  // Usage = total minutes across the *visible* recordings (matches filter)
  const usedMinutes = useMemo(() => {
    return (calls.data ?? []).reduce((acc, c) => acc + (c.duration_sec ?? 0), 0) / 60;
  }, [calls.data]);

  const limit = company.data?.monthly_recording_limit ?? 50;
  const limitMinutes = limit;

  const enqueuableSelected = useMemo(() => {
    if (!calls.data || selected.size === 0) return [] as string[];
    return calls.data
      .filter(
        (c) =>
          selected.has(c.id) &&
          (c.transcription_status === "skipped" ||
            c.transcription_status === "failed" ||
            c.transcription_status === "done"),
      )
      .map((c) => c.id);
  }, [calls.data, selected]);

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(visible: CallRow[]) {
    setSelected((prev) => {
      if (prev.size === visible.length) return new Set();
      return new Set(visible.map((c) => c.id));
    });
  }

  function transcribeOne(id: string) {
    transcribe.mutate(
      { call_ids: [id] },
      {
        onSuccess: (r) => {
          if (r.queued > 0) toast.success("Transcription queued");
          else if (r.skipped[0]) toast.info(`Skipped: ${r.skipped[0].reason}`);
        },
        onError: (e) => toast.error(e.message ?? "Could not queue transcription"),
      },
    );
  }

  function transcribeSelected() {
    if (enqueuableSelected.length === 0) {
      toast.info("Nothing eligible in selection");
      return;
    }
    transcribe.mutate(
      { call_ids: enqueuableSelected },
      {
        onSuccess: (r) => {
          toast.success(
            `Queued ${r.queued} call${r.queued === 1 ? "" : "s"}` +
              (r.skipped.length ? ` · skipped ${r.skipped.length}` : ""),
          );
          setSelected(new Set());
        },
        onError: (e) => toast.error(e.message ?? "Could not queue transcription"),
      },
    );
  }

  function exportCsv() {
    const rows = (calls.data ?? []).map((c) => {
      const member = team.data?.find((m) => m.user_id === c.user_id);
      const bucket = confidenceBucket(c.purchase_confidence);
      return [
        c.id,
        c.started_at,
        format(new Date(c.started_at), "yyyy-MM-dd"),
        format(new Date(c.started_at), "HH:mm:ss"),
        member?.label ?? member?.invited_email ?? "",
        c.user_id,
        c.assigned_contact_name ?? c.contact_name ?? "",
        c.assigned_contact_phone ?? c.phone_number ?? "",
        c.direction ?? "",
        c.duration_sec ?? 0,
        ((c.duration_sec ?? 0) / 60).toFixed(2),
        c.rating ?? "",
        c.purchase_confidence ?? "",
        bucket ? confidenceLabel(bucket).toLowerCase().replace(/\s/g, "_") : "",
        c.rated_at ? format(new Date(c.rated_at), "yyyy-MM-dd HH:mm:ss") : "",
        c.recording_storage_path ? "yes" : "no",
        c.transcription_status,
      ];
    });
    if (rows.length === 0) {
      toast.info("Nothing to export with the current filters");
      return;
    }
    const csv = buildCsv(
      [
        "call_id",
        "started_at_iso",
        "date",
        "time",
        "team_member_label",
        "team_member_user_id",
        "contact_name",
        "phone_number",
        "direction",
        "duration_sec",
        "duration_min",
        "rating_1_10",
        "purchase_confidence_1_10",
        "confidence_note",
        "rated_at",
        "has_recording",
        "transcription_status",
      ],
      rows,
    );
    const stamp = format(new Date(), "yyyy-MM-dd_HHmm");
    downloadCsv(`hdge-calls-${stamp}.csv`, csv);
    toast.success(`Exported ${rows.length} rows`);
  }

  const visible = calls.data ?? [];

  return (
    <>
      <PageHeader
        title="Manage Call Recordings"
        description="All call recordings synced from your team's phones, with playback, sharing, and filters."
        action={
          <div className="flex items-center gap-3">
            <WorkerStatusPill />
            <Button onClick={exportCsv} variant="outline">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        }
      />
      <div className="space-y-4 p-8">
        <Card>
          <CardContent className="grid gap-6 p-6 md:grid-cols-[220px_1fr] md:items-center">
            <UsageDonut
              usedMinutes={usedMinutes}
              limitMinutes={limitMinutes}
              label="minutes (visible)"
            />
            <RecordingsFilters
              team={team.data ?? []}
              value={filters}
              onApply={setFilters}
            />
          </CardContent>
        </Card>

        {selected.size > 0 && (
          <div className="sticky top-2 z-10 flex items-center justify-between rounded-md border bg-background px-4 py-2 shadow-sm">
            <div className="text-sm">
              <span className="font-medium">{selected.size}</span> selected
              {enqueuableSelected.length !== selected.size && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({enqueuableSelected.length} eligible to transcribe)
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelected(new Set())}
              >
                Clear
              </Button>
              <Button
                size="sm"
                onClick={transcribeSelected}
                disabled={
                  transcribe.isPending || enqueuableSelected.length === 0
                }
              >
                {transcribe.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                Transcribe {enqueuableSelected.length} selected
              </Button>
            </div>
          </div>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className="h-4 w-4 cursor-pointer accent-primary"
                      checked={visible.length > 0 && selected.size === visible.length}
                      onChange={() => toggleAll(visible)}
                    />
                  </TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Phone number</TableHead>
                  <TableHead>Team member</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Transcript</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">&nbsp;</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.isLoading &&
                  [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={10}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {visible.map((c) => {
                  const member = team.data?.find((m) => m.user_id === c.user_id);
                  const canTranscribe =
                    c.transcription_status === "skipped" ||
                    c.transcription_status === "failed" ||
                    c.transcription_status === "done";
                  return (
                    <TableRow key={c.id} className="cursor-pointer">
                      <TableCell
                        className="w-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select call ${c.id}`}
                          className="h-4 w-4 cursor-pointer accent-primary"
                          checked={selected.has(c.id)}
                          onChange={() => toggleRow(c.id)}
                        />
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground whitespace-nowrap"
                        onClick={() => setOpened(c)}
                      >
                        {format(new Date(c.started_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell
                        className="font-medium"
                        onClick={() => setOpened(c)}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.phone_number ?? "unknown"}
                        </span>
                      </TableCell>
                      <TableCell
                        className="text-muted-foreground"
                        onClick={() => setOpened(c)}
                      >
                        {member?.label ?? member?.invited_email ?? c.user_id.slice(0, 8)}
                      </TableCell>
                      <TableCell onClick={() => setOpened(c)}>
                        <DirectionBadge direction={c.direction} />
                      </TableCell>
                      <TableCell onClick={() => setOpened(c)}>
                        <RatingPill value={c.rating} />
                      </TableCell>
                      <TableCell onClick={() => setOpened(c)}>
                        <ConfidenceBadge value={c.purchase_confidence} compact />
                      </TableCell>
                      <TableCell onClick={() => setOpened(c)}>
                        <TranscriptStatusBadge status={c.transcription_status} />
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={() => setOpened(c)}
                      >
                        {formatDuration(c.duration_sec)}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canTranscribe ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => transcribeOne(c.id)}
                            disabled={transcribe.isPending}
                          >
                            <FileText className="h-3 w-3" /> transcribe
                          </button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                            onClick={() => setOpened(c)}
                          >
                            <Mic className="h-3 w-3" /> play
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!calls.isLoading && !visible.length && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      No recordings match those filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <PlaybackSheet call={opened} onClose={() => setOpened(null)} />
    </>
  );
}

function TranscriptStatusBadge({ status }: { status: TranscriptionStatus }) {
  if (status === "done") return <Badge variant="success">Ready</Badge>;
  if (status === "processing")
    return (
      <Badge variant="warning" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Transcribing…
      </Badge>
    );
  if (status === "pending") return <Badge variant="warning">Queued</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <span className="text-xs text-muted-foreground">—</span>;
}
