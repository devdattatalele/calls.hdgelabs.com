import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Mic } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import { useCalls } from "@/lib/queries/calls";
import { useTeam } from "@/lib/queries/team";
import type { CallDirection } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { DirectionBadge } from "@/components/DirectionBadge";
import {
  RecordingsFilters,
  type RecordingsFilterState,
} from "@/components/RecordingsFilters";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";

const DIRECTIONS: { label: string; value?: CallDirection }[] = [
  { label: "All", value: undefined },
  { label: "Incoming", value: "incoming" },
  { label: "Outgoing", value: "outgoing" },
  { label: "Missed", value: "missed" },
  { label: "Rejected", value: "rejected" },
];

export function CallsPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const team = useTeam(company.data?.id);

  const [direction, setDirection] = useState<CallDirection | undefined>(undefined);
  const [hasRecording, setHasRecording] = useState(false);
  const [filters, setFilters] = useState<RecordingsFilterState>({});

  const apiFilters = useMemo(
    () => ({
      direction,
      hasRecording: hasRecording || undefined,
      memberUserId: filters.memberUserId,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to + "T23:59:59").toISOString() : undefined,
      phoneNumber: filters.phone,
    }),
    [direction, hasRecording, filters],
  );
  const calls = useCalls(apiFilters, 300);

  return (
    <>
      <PageHeader title="All calls" description="Every call your team has logged." />
      <div className="p-8 space-y-4">
        <Card>
          <CardContent className="space-y-4 p-5">
            <RecordingsFilters
              team={team.data ?? []}
              value={filters}
              onApply={setFilters}
            />
            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              <span className="mr-1 text-xs uppercase tracking-wide text-muted-foreground">
                Direction
              </span>
              {DIRECTIONS.map((d) => (
                <Button
                  key={d.label}
                  variant={direction === d.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDirection(d.value)}
                >
                  {d.label}
                </Button>
              ))}
              <Button
                variant={hasRecording ? "default" : "outline"}
                size="sm"
                onClick={() => setHasRecording((v) => !v)}
                className="ml-auto"
              >
                <Mic className="h-4 w-4" />
                With recording
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Team member</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Recording</TableHead>
                  <TableHead className="text-right">&nbsp;</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.isLoading &&
                  [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {calls.data?.map((c) => {
                  const member = team.data?.find((m) => m.user_id === c.user_id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(c.started_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {c.phone_number ?? "unknown"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member?.label ?? member?.invited_email ?? c.user_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <DirectionBadge direction={c.direction} />
                      </TableCell>
                      <TableCell>{formatDuration(c.duration_sec)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.recording_storage_path ? (
                          <span className="inline-flex items-center gap-1 text-xs">
                            <Mic className="h-3 w-3" /> available
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/calls/${c.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!calls.isLoading && !calls.data?.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      No calls match those filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
