import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Loader2, Phone } from "lucide-react";
import { useCalls } from "@/lib/queries/calls";
import { PageHeader } from "@/components/PageHeader";
import { WorkerStatusPill } from "@/components/WorkerStatusPill";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CallRow, TranscriptionStatus } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

/**
 * The Transcripts page is the manager's queue view: what's mid-transcription
 * right now, what's been transcribed recently. Enqueue itself happens on the
 * Recordings page (multi-select or per-row button) or on each Call detail.
 */
export function TranscriptsPage() {
  const all = useCalls({ hasRecording: true }, 500);
  const qc = useQueryClient();

  const inProgress = useMemo(
    () =>
      (all.data ?? []).filter(
        (c) =>
          c.transcription_status === "pending" ||
          c.transcription_status === "processing",
      ),
    [all.data],
  );

  const recent = useMemo(
    () =>
      (all.data ?? [])
        .filter((c) => c.transcription_status === "done")
        .slice(0, 50),
    [all.data],
  );

  const failed = useMemo(
    () => (all.data ?? []).filter((c) => c.transcription_status === "failed"),
    [all.data],
  );

  // Poll while anything is in-flight.
  useEffect(() => {
    if (inProgress.length === 0) return;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["calls"] });
    }, 5000);
    return () => clearInterval(t);
  }, [inProgress.length, qc]);

  return (
    <>
      <PageHeader
        title="Transcripts"
        description="Queue and history for on-demand call transcription."
        action={<WorkerStatusPill />}
      />
      <div className="space-y-6 p-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Loader2
                className={
                  inProgress.length > 0
                    ? "h-4 w-4 animate-spin text-amber-500"
                    : "h-4 w-4 text-muted-foreground"
                }
              />
              In progress
            </CardTitle>
            <Badge variant="outline">{inProgress.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <CallsTable rows={inProgress} emptyText="Nothing queued. Pick calls on the Recordings page to transcribe them." />
          </CardContent>
        </Card>

        {failed.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Failed</CardTitle>
              <Badge variant="destructive">{failed.length}</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <CallsTable rows={failed} emptyText="No failures." />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-600" />
              Recent transcripts
            </CardTitle>
            <Badge variant="success">{recent.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <CallsTable rows={recent} emptyText="No transcripts yet." />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function CallsTable({ rows, emptyText }: { rows: CallRow[]; emptyText: string }) {
  if (rows.length === 0) {
    return (
      <div className="px-6 py-10 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>When</TableHead>
          <TableHead>Phone number</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead className="text-right">Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id} className="cursor-pointer">
            <TableCell className="text-muted-foreground whitespace-nowrap">
              <Link to={`/calls/${c.id}`} className="hover:underline">
                {format(new Date(c.started_at), "MMM d, HH:mm")}
              </Link>
            </TableCell>
            <TableCell className="font-medium">
              <Link to={`/calls/${c.id}`} className="hover:underline">
                <span className="inline-flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  {c.phone_number ?? "unknown"}
                </span>
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={c.transcription_status} />
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {c.transcript_provider ?? "—"}
            </TableCell>
            <TableCell className="text-right">
              {formatDuration(c.duration_sec)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusBadge({ status }: { status: TranscriptionStatus }) {
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
