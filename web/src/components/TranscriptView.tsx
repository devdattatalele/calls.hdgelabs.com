import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CallRow, TranscriptSegment } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

/**
 * Two-layer transcript renderer:
 *   - Roman (Layer 1) — the IndicConformer ASR output transliterated to
 *     Roman script. Preserves Marathi/Hindi flavour ("halo halo ha mi
 *     bolato ki apanating karuya").
 *   - English (Layer 2) — IndicTrans2 translation of the same audio
 *     ("Hello hello, I'm telling you...").
 *
 * Tabs at the top let the reviewer flip between the two without losing
 * timeline context.
 */
export function TranscriptView({ call }: { call: CallRow }) {
  const [view, setView] = useState<"roman" | "english">("roman");

  if (call.transcription_status !== "done") {
    return (
      <div className="flex items-center justify-center rounded-md border bg-muted/30 p-8 text-sm text-muted-foreground">
        Transcript {call.transcription_status}…
      </div>
    );
  }

  const segments = call.transcript_segments ?? [];
  const hasRoman = !!(call.transcript && call.transcript.trim());
  const hasEnglish = !!(call.transcript_english && call.transcript_english.trim());

  // If neither layer has anything to render, show an empty-state.
  if (!hasRoman && !hasEnglish) {
    return (
      <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
        No transcript text.
      </div>
    );
  }

  // The active layer falls back to whichever is available.
  const showEnglish = view === "english" && hasEnglish;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-md border bg-muted/30 p-0.5 text-xs">
          <TabButton
            active={view === "roman"}
            disabled={!hasRoman}
            onClick={() => setView("roman")}
            title="Original speech, transliterated to Roman script"
          >
            Roman
          </TabButton>
          <TabButton
            active={view === "english"}
            disabled={!hasEnglish}
            onClick={() => setView("english")}
            title="Translated to English"
          >
            English
          </TabButton>
        </div>
        {call.transcript_provider && (
          <div className="text-right text-xs text-muted-foreground">
            via {call.transcript_provider}
          </div>
        )}
      </div>

      {showEnglish ? (
        <div className="whitespace-pre-wrap rounded-md border bg-card p-4 text-sm leading-6">
          {call.transcript_english}
        </div>
      ) : segments.length > 0 ? (
        <div className="space-y-2 rounded-md border bg-card p-4">
          {segments.map((s: TranscriptSegment, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <div className="w-14 shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatDuration(Math.round(s.start))}
              </div>
              <div className="flex-1">
                {s.speaker !== undefined && (
                  <Badge
                    variant="outline"
                    className={`mr-2 mb-1 ${speakerColor(s.speaker)}`}
                  >
                    Speaker {s.speaker}
                  </Badge>
                )}
                <span>{s.text}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="whitespace-pre-wrap rounded-md border bg-card p-4 text-sm leading-6">
          {call.transcript}
        </div>
      )}

      {hasRoman && hasEnglish && (
        <div className="text-xs text-muted-foreground">
          Switch tabs to compare the source-language transcript with the
          English translation. Both are derived from the same audio.
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={
        "h-7 px-3 text-xs " +
        (active
          ? "bg-background shadow-sm"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </Button>
  );
}

function speakerColor(id: string | number): string {
  const n = typeof id === "number" ? id : parseInt(String(id), 10);
  const even = Number.isFinite(n) ? n % 2 === 0 : id.toString().charCodeAt(0) % 2 === 0;
  return even
    ? "border-sky-500/40 text-sky-700 dark:text-sky-300"
    : "border-amber-500/40 text-amber-700 dark:text-amber-300";
}
