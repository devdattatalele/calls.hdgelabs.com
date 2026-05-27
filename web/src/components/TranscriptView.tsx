import { Badge } from "@/components/ui/badge";
import type { CallRow, TranscriptSegment } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export function TranscriptView({ call }: { call: CallRow }) {
  if (call.transcription_status !== "done") {
    return (
      <div className="flex items-center justify-center rounded-md border bg-muted/30 p-8 text-sm text-muted-foreground">
        Transcript {call.transcription_status}…
      </div>
    );
  }

  const segments = call.transcript_segments ?? [];

  if (!segments.length && call.transcript) {
    return (
      <div className="whitespace-pre-wrap rounded-md border bg-card p-4 text-sm leading-6">
        {call.transcript}
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border bg-card p-4">
      {segments.map((s: TranscriptSegment, i) => (
        <div key={i} className="flex gap-3 text-sm">
          <div className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatDuration(Math.round(s.start))}
          </div>
          <div className="flex-1">
            {s.speaker !== undefined && (
              <Badge variant="outline" className="mr-2 mb-1">
                Speaker {s.speaker}
              </Badge>
            )}
            <span>{s.text}</span>
          </div>
        </div>
      ))}
      {call.transcript_provider && (
        <div className="pt-2 text-right text-xs text-muted-foreground">
          via {call.transcript_provider}
        </div>
      )}
    </div>
  );
}
