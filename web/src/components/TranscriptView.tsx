import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CallRow, TranscriptSegment } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

type View = "roman" | "mixed" | "english";

/**
 * Three-layer transcript renderer for the same audio:
 *
 *   Roman   — IndicConformer ASR transliterated to Roman.
 *             Best Marathi/Hindi accuracy, drops English code-switches.
 *   Mixed   — whisper.cpp ASR (code-switched Hinglish).
 *             Preserves English words like "meeting", "UI", "system"; less
 *             accurate on pure Indic.
 *   English — IndicTrans2 translation of the Roman layer.
 *             Comprehension-friendly summary for non-Indic readers.
 *
 * Tabs auto-fall back to whichever layer has content. The tab itself is
 * disabled (greyed) when its layer is empty so the manager isn't tricked
 * into clicking a blank panel.
 */
export function TranscriptView({ call }: { call: CallRow }) {
  const hasRoman = !!(call.transcript && call.transcript.trim());
  const hasMixed = !!(call.transcript_mixed && call.transcript_mixed.trim());
  const hasEnglish = !!(call.transcript_english && call.transcript_english.trim());

  const defaultView: View = hasRoman ? "roman" : hasMixed ? "mixed" : "english";
  const [view, setView] = useState<View>(defaultView);

  // If a call finishes processing while the user is on this view, switch
  // to the default once data lands rather than stay on an empty tab.
  useEffect(() => {
    if (view === "roman" && !hasRoman) setView(defaultView);
    if (view === "mixed" && !hasMixed) setView(defaultView);
    if (view === "english" && !hasEnglish) setView(defaultView);
  }, [view, hasRoman, hasMixed, hasEnglish, defaultView]);

  if (call.transcription_status !== "done") {
    return (
      <div className="flex items-center justify-center rounded-md border bg-muted/30 p-8 text-sm text-muted-foreground">
        Transcript {call.transcription_status}…
      </div>
    );
  }

  if (!hasRoman && !hasMixed && !hasEnglish) {
    return (
      <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
        No transcript text.
      </div>
    );
  }

  const segments = call.transcript_segments ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="inline-flex rounded-md border bg-muted/30 p-0.5 text-xs">
          <TabButton
            active={view === "roman"}
            disabled={!hasRoman}
            onClick={() => setView("roman")}
            title="Native-script ASR transliterated to Roman — best on Indian languages, drops English code-switches"
          >
            Roman
          </TabButton>
          <TabButton
            active={view === "mixed"}
            disabled={!hasMixed}
            onClick={() => setView("mixed")}
            title="Code-switched Hinglish transcript — preserves English words like 'meeting', 'UI'"
          >
            Mixed
          </TabButton>
          <TabButton
            active={view === "english"}
            disabled={!hasEnglish}
            onClick={() => setView("english")}
            title="Translated to proper English — comprehension-friendly summary"
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

      {view === "english" && hasEnglish ? (
        <PlainBlock text={call.transcript_english!} />
      ) : view === "mixed" && hasMixed ? (
        <PlainBlock text={call.transcript_mixed!} />
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
        <PlainBlock text={call.transcript ?? ""} />
      )}

      <p className="text-xs text-muted-foreground">
        {layerTip(view)}
      </p>
    </div>
  );
}

function layerTip(view: View): string {
  if (view === "roman")
    return "Romanised native-script ASR. Best for Indic accuracy; English words may be dropped or phonetically approximated.";
  if (view === "mixed")
    return "Code-switched ASR. Preserves English words ('meeting', 'UI', 'system'); less accurate on pure Indic.";
  return "Machine translation to English. Cleaner reading; specific Indic phrasing may be smoothed away.";
}

function PlainBlock({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap rounded-md border bg-card p-4 text-sm leading-6">
      {text}
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
