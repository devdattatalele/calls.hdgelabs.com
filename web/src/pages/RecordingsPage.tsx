import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Mic, Phone } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import { useCalls } from "@/lib/queries/calls";
import { useTeam } from "@/lib/queries/team";
import { PageHeader } from "@/components/PageHeader";
import {
  RecordingsFilters,
  type RecordingsFilterState,
} from "@/components/RecordingsFilters";
import { UsageDonut } from "@/components/UsageDonut";
import { PlaybackSheet } from "@/components/PlaybackSheet";
import { DirectionBadge } from "@/components/DirectionBadge";
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
import type { CallRow } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

export function RecordingsPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const team = useTeam(company.data?.id);
  const [filters, setFilters] = useState<RecordingsFilterState>({});
  const [opened, setOpened] = useState<CallRow | null>(null);

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

  // Usage = total minutes across the *visible* recordings (matches filter)
  const usedMinutes = useMemo(() => {
    return (calls.data ?? []).reduce((acc, c) => acc + (c.duration_sec ?? 0), 0) / 60;
  }, [calls.data]);

  const limit = company.data?.monthly_recording_limit ?? 50;
  // 1000-minutes plan: convert limit to minutes if backend stores it that way.
  // For now treat monthly_recording_limit as minutes (we'll switch to a
  // dedicated minutes_limit once Polar billing flips the field).
  const limitMinutes = limit;

  return (
    <>
      <PageHeader
        title="Manage Call Recordings"
        description="All call recordings synced from your team's phones, with playback, sharing, and filters."
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

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Phone number</TableHead>
                  <TableHead>Team member</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">&nbsp;</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.isLoading &&
                  [...Array(8)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {calls.data?.map((c) => {
                  const member = team.data?.find((m) => m.user_id === c.user_id);
                  return (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer"
                      onClick={() => setOpened(c)}
                    >
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(c.started_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          {c.phone_number ?? "unknown"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member?.label ?? member?.invited_email ?? c.user_id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <DirectionBadge direction={c.direction} />
                      </TableCell>
                      <TableCell className="text-right">{formatDuration(c.duration_sec)}</TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Mic className="h-3 w-3" /> play
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!calls.isLoading && !calls.data?.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
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
