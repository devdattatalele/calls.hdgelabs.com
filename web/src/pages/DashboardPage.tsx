import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import { useCalls, useTodayStats } from "@/lib/queries/calls";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { DirectionBadge } from "@/components/DirectionBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function DashboardPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const stats = useTodayStats(company.data?.id);
  const recent = useCalls({}, 8);

  const counts = stats.data?.counts;

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Today, ${format(new Date(), "EEEE d MMMM")}`}
      />
      <div className="space-y-6 p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total today"
            value={stats.isLoading ? <Skeleton className="h-7 w-12" /> : counts?.total ?? 0}
            icon={<PhoneCall className="h-4 w-4" />}
          />
          <StatCard
            label="Incoming"
            value={counts?.incoming ?? 0}
            icon={<ArrowDownLeft className="h-4 w-4" />}
            accent="success"
          />
          <StatCard
            label="Outgoing"
            value={counts?.outgoing ?? 0}
            icon={<ArrowUpRight className="h-4 w-4" />}
          />
          <StatCard
            label="Missed"
            value={counts?.missed ?? 0}
            icon={<PhoneMissed className="h-4 w-4" />}
            accent="warning"
          />
          <StatCard
            label="Rejected"
            value={counts?.rejected ?? 0}
            icon={<PhoneOff className="h-4 w-4" />}
            accent="danger"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <StatCard
            label="Engagement time today"
            value={formatDuration(counts?.engagementSec ?? 0)}
            hint="sum of duration across every call"
            icon={<Clock className="h-4 w-4" />}
          />
          <StatCard
            label="Avg call duration"
            value={formatDuration(counts?.avgDurationSec ?? 0)}
            hint="across today's calls"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calls by hour</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart
                data={(stats.data?.hourly ?? new Array(24).fill(0)).map((v, i) => ({
                  hour: `${i.toString().padStart(2, "0")}:00`,
                  calls: v,
                }))}
                margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="calls" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent calls</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Number</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.isLoading &&
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      </TableRow>
                    ))}
                  {recent.data?.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(c.started_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {c.phone_number ?? "unknown"}
                      </TableCell>
                      <TableCell>
                        <DirectionBadge direction={c.direction} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatDuration(c.duration_sec)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!recent.isLoading && !recent.data?.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No calls yet — add team members and install the app on their phones.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top numbers today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(stats.data?.topNumbers ?? []).length === 0 && (
                <div className="text-sm text-muted-foreground">No data yet.</div>
              )}
              {stats.data?.topNumbers.map((n) => (
                <div
                  key={n.number}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{n.number}</span>
                  <span className="text-muted-foreground">{n.count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
