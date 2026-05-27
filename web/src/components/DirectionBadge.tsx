import { ArrowDownLeft, ArrowUpRight, PhoneMissed, PhoneOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CallDirection } from "@/lib/types";

export function DirectionBadge({ direction }: { direction: CallDirection | null }) {
  if (!direction) return <Badge variant="outline">unknown</Badge>;
  const cfg = {
    incoming: { label: "Incoming", icon: ArrowDownLeft, variant: "success" as const },
    outgoing: { label: "Outgoing", icon: ArrowUpRight, variant: "default" as const },
    missed: { label: "Missed", icon: PhoneMissed, variant: "warning" as const },
    rejected: { label: "Rejected", icon: PhoneOff, variant: "destructive" as const },
  }[direction];
  const Icon = cfg.icon;
  return (
    <Badge variant={cfg.variant} className="inline-flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}
