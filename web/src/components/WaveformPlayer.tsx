import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";

export function WaveformPlayer({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "hsl(240 5% 70%)",
      progressColor: "hsl(240 5.9% 10%)",
      cursorColor: "hsl(240 5.9% 10%)",
      height: 64,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      url,
    });
    wsRef.current = ws;
    ws.on("ready", () => {
      setReady(true);
      setDuration(ws.getDuration());
    });
    ws.on("play", () => setPlaying(true));
    ws.on("pause", () => setPlaying(false));
    ws.on("finish", () => setPlaying(false));
    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [url]);

  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="default"
          onClick={() => wsRef.current?.playPause()}
          disabled={!ready}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <div ref={containerRef} className="flex-1" />
        <div className="w-16 text-right text-xs tabular-nums text-muted-foreground">
          {formatDuration(Math.round(duration))}
        </div>
      </div>
    </div>
  );
}
