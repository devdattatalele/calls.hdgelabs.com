import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Download, ThumbsUp, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import { useCalls } from "@/lib/queries/calls";
import { useTeam } from "@/lib/queries/team";
import {
  confidenceBucket,
  confidenceLabel,
  type ConfidenceBucket,
} from "@/lib/types";
import { buildCsv, downloadCsv } from "@/lib/csv";
import { PageHeader } from "@/components/PageHeader";
import {
  RecordingsFilters,
  type RecordingsFilterState,
} from "@/components/RecordingsFilters";
import { StatCard } from "@/components/StatCard";
import { ConfidenceBadge, RatingPill } from "@/components/ConfidenceBadge";
import { DirectionBadge } from "@/components/DirectionBadge";
import { Button } from "@/components/ui/button";
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

const BUCKET_COLORS: Record<ConfidenceBucket, string> = {
  sure: "#10b981",
  mid: "#f59e0b",
  not_sure: "#ef4444",
};

export function ReportsPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const team = useTeam(company.data?.id);

  const [filters, setFilters] = useState<RecordingsFilterState>(() => ({
    from: format(subDays(new Date(), 30), "yyyy-MM-dd"),
  }));

  const apiFilters = useMemo(
    () => ({
      memberUserId: filters.memberUserId,
      from: filters.from ? new Date(filters.from).toISOString() : undefined,
      to: filters.to ? new Date(filters.to + "T23:59:59").toISOString() : undefined,
      phoneNumber: filters.phone,
    }),
    [filters],
  );
  const calls = useCalls(apiFilters, 5000);

  const stats = useMemo(() => {
    const rows = (calls.data ?? []).filter((c) => c.rating != null);
    const buckets: Record<ConfidenceBucket, number> = { sure: 0, mid: 0, not_sure: 0 };
    let ratingSum = 0;
    let confSum = 0;
    const byMember = new Map<
      string,
      { rated: number; sure: number; mid: number; not_sure: number; ratingSum: number; confSum: number }
    >();
    const byDay = new Map<string, { sure: number; mid: number; not_sure: number }>();
    for (const c of rows) {
      const b = confidenceBucket(c.purchase_confidence);
      if (b) buckets[b] += 1;
      ratingSum += c.rating ?? 0;
      confSum += c.purchase_confidence ?? 0;

      const mid = byMember.get(c.user_id) ?? {
        rated: 0, sure: 0, mid: 0, not_sure: 0, ratingSum: 0, confSum: 0,
      };
      mid.rated += 1;
      if (b) mid[b] += 1;
      mid.ratingSum += c.rating ?? 0;
      mid.confSum += c.purchase_confidence ?? 0;
      byMember.set(c.user_id, mid);

      const day = format(new Date(c.started_at), "MMM d");
      const d = byDay.get(day) ?? { sure: 0, mid: 0, not_sure: 0 };
      if (b) d[b] += 1;
      byDay.set(day, d);
    }
    const trend = [...byDay.entries()].map(([day, v]) => ({ day, ...v }));
    const memberRows = [...byMember.entries()].map(([uid, v]) => ({
      uid,
      rated: v.rated,
      sure: v.sure,
      mid: v.mid,
      not_sure: v.not_sure,
      avg_rating: v.rated ? +(v.ratingSum / v.rated).toFixed(2) : 0,
      avg_conf: v.rated ? +(v.confSum / v.rated).toFixed(2) : 0,
      sure_rate: v.rated ? Math.round((v.sure / v.rated) * 100) : 0,
    }));
    return {
      rated: rows.length,
      unrated: (calls.data ?? []).length - rows.length,
      buckets,
      avgRating: rows.length ? +(ratingSum / rows.length).toFixed(2) : 0,
      avgConf: rows.length ? +(confSum / rows.length).toFixed(2) : 0,
      trend,
      memberRows,
    };
  }, [calls.data]);

  const memberLabel = (uid: string) =>
    team.data?.find((m) => m.user_id === uid)?.label ??
    team.data?.find((m) => m.user_id === uid)?.invited_email ??
    uid.slice(0, 8);

  function exportRatingsCsv() {
    const rows = (calls.data ?? [])
      .filter((c) => c.rating != null || c.purchase_confidence != null)
      .map((c) => {
        const member = team.data?.find((m) => m.user_id === c.user_id);
        const b = confidenceBucket(c.purchase_confidence);
        return [
          c.id,
          format(new Date(c.started_at), "yyyy-MM-dd HH:mm:ss"),
          member?.label ?? member?.invited_email ?? "",
          c.assigned_contact_name ?? c.contact_name ?? "",
          c.assigned_contact_phone ?? c.phone_number ?? "",
          c.direction ?? "",
          c.duration_sec ?? 0,
          c.rating ?? "",
          c.purchase_confidence ?? "",
          b ? confidenceLabel(b).toLowerCase().replace(/\s/g, "_") : "",
          c.rated_at ? format(new Date(c.rated_at), "yyyy-MM-dd HH:mm:ss") : "",
        ];
      });
    if (rows.length === 0) {
      toast.info("No rated calls to export with the current filters");
      return;
    }
    const csv = buildCsv(
      [
        "call_id",
        "call_started_at",
        "team_member",
        "contact_name",
        "phone_number",
        "direction",
        "duration_sec",
        "rating_1_10",
        "purchase_confidence_1_10",
        "confidence_note",
        "rated_at",
      ],
      rows,
    );
    const stamp = format(new Date(), "yyyy-MM-dd_HHmm");
    downloadCsv(`hdge-ratings-${stamp}.csv`, csv);
    toast.success(`Exported ${rows.length} rated calls`);
  }

  const pieData = (Object.keys(stats.buckets) as ConfidenceBucket[])
    .map((k) => ({ name: confidenceLabel(k), key: k, value: stats.buckets[k] }))
    .filter((d) => d.value > 0);

  return (
    <>
      <PageHeader
        title="Reports"
        description="Rating distribution, top performers, and exportable CSVs."
        action={
          <Button onClick={exportRatingsCsv} variant="outline">
            <Download className="h-4 w-4" />
            Export ratings CSV
          </Button>
        }
      />
      <div className="space-y-4 p-8">
        <Card>
          <CardContent className="p-5">
            <RecordingsFilters team={team.data ?? []} value={filters} onApply={setFilters} />
          </CardContent>
        </Card>

        {/* Top stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            label="Calls rated"
            value={calls.isLoading ? <Skeleton className="h-7 w-12" /> : stats.rated}
            hint={stats.unrated ? `${stats.unrated} unrated` : "all rated"}
            icon={<ThumbsUp className="h-4 w-4" />}
          />
          <StatCard
            label="Avg rating"
            value={stats.avgRating || "—"}
            hint="out of 10"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label="Avg confidence"
            value={stats.avgConf || "—"}
            hint="out of 10"
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            label="‘Sure’ rate"
            value={
              stats.rated
                ? `${Math.round((stats.buckets.sure / stats.rated) * 100)}%`
                : "—"
            }
            hint={`${stats.buckets.sure} of ${stats.rated}`}
            icon={<Users className="h-4 w-4" />}
            accent="success"
          />
        </div>

        {/* Distribution charts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Confidence breakdown</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {pieData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Nothing rated yet in this window.
                </div>
              ) : (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {pieData.map((d) => (
                        <Cell
                          key={d.key}
                          fill={BUCKET_COLORS[d.key as ConfidenceBucket]}
                        />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Confidence over time</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {stats.trend.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No data yet.
                </div>
              ) : (
                <ResponsiveContainer>
                  <BarChart
                    data={stats.trend}
                    margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sure" stackId="b" fill={BUCKET_COLORS.sure} name="Sure" />
                    <Bar dataKey="mid" stackId="b" fill={BUCKET_COLORS.mid} name="Mid" />
                    <Bar dataKey="not_sure" stackId="b" fill={BUCKET_COLORS.not_sure} name="Not sure" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per-member breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>By team member</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead className="text-right">Rated calls</TableHead>
                  <TableHead className="text-right">Avg rating</TableHead>
                  <TableHead className="text-right">Avg confidence</TableHead>
                  <TableHead className="text-right">Sure</TableHead>
                  <TableHead className="text-right">Mid</TableHead>
                  <TableHead className="text-right">Not sure</TableHead>
                  <TableHead className="text-right">Sure rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.memberRows
                  .sort((a, b) => b.sure_rate - a.sure_rate)
                  .map((m) => (
                    <TableRow key={m.uid}>
                      <TableCell className="font-medium">{memberLabel(m.uid)}</TableCell>
                      <TableCell className="text-right">{m.rated}</TableCell>
                      <TableCell className="text-right">
                        <RatingPill value={m.avg_rating} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RatingPill value={m.avg_conf} />
                      </TableCell>
                      <TableCell className="text-right">{m.sure}</TableCell>
                      <TableCell className="text-right">{m.mid}</TableCell>
                      <TableCell className="text-right">{m.not_sure}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.sure_rate}%</TableCell>
                    </TableRow>
                  ))}
                {stats.memberRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No rated calls in this window.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* All rated calls table */}
        <Card>
          <CardHeader>
            <CardTitle>Rated calls</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Rating</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(calls.data ?? [])
                  .filter((c) => c.rating != null || c.purchase_confidence != null)
                  .slice(0, 100)
                  .map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {format(new Date(c.started_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {c.assigned_contact_name ?? c.contact_name ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {c.assigned_contact_phone ?? c.phone_number ?? ""}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {memberLabel(c.user_id)}
                      </TableCell>
                      <TableCell>
                        <DirectionBadge direction={c.direction} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RatingPill value={c.rating} />
                      </TableCell>
                      <TableCell>
                        <ConfidenceBadge value={c.purchase_confidence} />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

