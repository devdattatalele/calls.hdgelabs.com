import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Copy, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { CallRow } from "@/lib/types";
import { DirectionBadge } from "@/components/DirectionBadge";
import { WaveformPlayer } from "@/components/WaveformPlayer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatDuration } from "@/lib/utils";

interface Props {
  call: CallRow | null;
  onClose: () => void;
}

export function PlaybackSheet({ call, onClose }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!call?.id || !call.recording_storage_path) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    setSignedUrl(null);
    api
      .get<{ url: string }>(`/v1/dashboard/recordings/sign?call_id=${call.id}`)
      .then((r) => !cancelled && setSignedUrl(r.url))
      .catch((e) => toast.error(e.message ?? "Could not load recording"));
    return () => {
      cancelled = true;
    };
  }, [call?.id, call?.recording_storage_path]);

  async function copyShare() {
    if (!signedUrl) return;
    await navigator.clipboard.writeText(signedUrl);
    toast.success("Share link copied (valid 10 min)");
  }

  return (
    <Sheet open={!!call} onOpenChange={(o) => !o && onClose()}>
      <SheetContent>
        {call && (
          <>
            <SheetHeader>
              <SheetTitle>{call.phone_number ?? "unknown"}</SheetTitle>
              <SheetDescription>
                {format(new Date(call.started_at), "EEE d MMM yyyy, HH:mm")} ·{" "}
                {formatDuration(call.duration_sec)}
              </SheetDescription>
              <div className="flex items-center gap-2 pt-1">
                <DirectionBadge direction={call.direction} />
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/calls/${call.id}`}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open detail
                  </Link>
                </Button>
                {signedUrl && (
                  <Button variant="ghost" size="sm" onClick={copyShare}>
                    <Copy className="h-3.5 w-3.5" />
                    Copy link
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              {!call.recording_storage_path ? (
                <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
                  No recording attached to this call.
                </div>
              ) : !signedUrl ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <WaveformPlayer url={signedUrl} />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
