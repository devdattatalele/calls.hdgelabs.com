import { useMemo } from "react";
import { format, subDays } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";
import { useCalls } from "@/lib/queries/calls";
import { useTeam } from "@/lib/queries/team";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DIRECTION_COLORS: Record<string, string> = {
  incoming: "#10b981",
  outgoing: "#3b82f6",
  missed: "#f59e0b",
  rejected: "#ef4444",
};

export function AnalyticsPage() {
  const { user } = useAuth();
  const company = useMyCompany(user?.id);
  const since = useMemo(() => subDays(new Date(), 30).toISOString(), []);
  const calls = useCalls({ from: since }, 5000);
  const team = useTeam(company.data?.id);

  const data = useMemo(() => {
    const byDay = new Map<string, number>();
    const byDirection = { incoming: 0, outgoing: 0, missed: 0, rejected: 0 };
    const durByDay = new Map<string, { sum: number; n: number }>();
    const byMember = new Map<string, { calls: number; minutes: number }>();
    for (const c of calls.data ?? []) {
      const day = format(new Date(c.started_at), "MMM d");
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
      if (c.direction && c.direction in byDirection) {
        (byDirection as Record<string, number>)[c.direction] += 1;
      }
      const cur = durByDay.get(day) ?? { sum: 0, n: 0 };
      cur.sum += c.duration_sec ?? 0;
      cur.n += 1;
      durByDay.set(day, cur);

      const m = byMember.get(c.user_id) ?? { calls: 0, minutes: 0 };
      m.calls += 1;
      m.minutes += (c.duration_sec ?? 0) / 60;
      byMember.set(c.user_id, m);
    }
    const trend = [...byDay.entries()].map(([day, count]) => ({
      day,
      calls: count,
      avgMin:
        Math.round((((durByDay.get(day)?.sum ?? 0) / (durByDay.get(day)?.n ?? 1)) / 60) * 10) /
        10,
    }));
    const directionPie = Object.entries(byDirection).map(([name, value]) => ({
      name,
      value,
    }));
    const memberRows = [...byMember.entries()].map(([uid, v]) => ({
      uid,
      calls: v.calls,
      minutes: Math.round(v.minutes * 10) / 10,
    }));
    return { trend, directionPie, memberRows };
  }, [calls.data]);

  const memberLabel = (uid: string) =>
    team.data?.find((m) => m.user_id === uid)?.label ??
    team.data?.find((m) => m.user_id === uid)?.invited_email ??
    uid.slice(0, 8);

  return (
    <>
      <PageHeader title="Analytics" description="Last 30 days, across the whole team." />
      <div className="grid gap-4 p-8 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calls per day</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <LineChart data={data.trend} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="calls"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Direction breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.directionPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label
                >
                  {data.directionPie.map((d) => (
                    <Cell key={d.name} fill={DIRECTION_COLORS[d.name] ?? "#888"} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avg call duration (min)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer>
              <BarChart data={data.trend} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avgMin" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Team comparison</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer>
              <BarChart
                data={data.memberRows.map((m) => ({ ...m, name: memberLabel(m.uid) }))}
                margin={{ top: 10, right: 16, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="l" dataKey="calls" fill="hsl(var(--primary))" name="calls" />
                <Bar yAxisId="r" dataKey="minutes" fill="#10b981" name="minutes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
