import { Badge } from "@/components/ui/badge";
import { confidenceBucket, confidenceLabel } from "@/lib/types";

export function ConfidenceBadge({
  value,
  compact = false,
}: {
  value: number | null | undefined;
  compact?: boolean;
}) {
  const bucket = confidenceBucket(value);
  if (!bucket) {
    return (
      <span className="text-xs text-muted-foreground/60">
        {compact ? "—" : "Not rated"}
      </span>
    );
  }
  const variant =
    bucket === "sure" ? "success" : bucket === "mid" ? "warning" : "destructive";
  return (
    <Badge variant={variant} className="capitalize">
      {confidenceLabel(bucket)}
      {!compact && value != null && (
        <span className="ml-1 opacity-75">· {value}/10</span>
      )}
    </Badge>
  );
}

export function RatingPill({
  value,
}: {
  value: number | null | undefined;
}) {
  if (value == null) return <span className="text-xs text-muted-foreground/60">—</span>;
  return (
    <span className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-0.5 text-xs font-medium tabular-nums">
      {value}
      <span className="text-muted-foreground">/10</span>
    </span>
  );
}
