import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { useCalls } from "@/lib/queries/calls";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function NumbersPage() {
  const calls = useCalls({}, 5000);
  const rows = useMemo(() => {
    const map = new Map<
      string,
      { total: number; minutes: number; last: string }
    >();
    for (const c of calls.data ?? []) {
      const k = c.phone_number ?? "unknown";
      const cur = map.get(k) ?? { total: 0, minutes: 0, last: c.started_at };
      cur.total += 1;
      cur.minutes += (c.duration_sec ?? 0) / 60;
      if (new Date(c.started_at) > new Date(cur.last)) cur.last = c.started_at;
      map.set(k, cur);
    }
    return [...map.entries()]
      .map(([number, v]) => ({
        number,
        total: v.total,
        minutes: Math.round(v.minutes * 10) / 10,
        last: v.last,
      }))
      .sort((a, b) => b.total - a.total);
  }, [calls.data]);

  return (
    <>
      <PageHeader title="Numbers" description="Every phone number your team has talked to." />
      <div className="p-8">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Total calls</TableHead>
                  <TableHead>Total minutes</TableHead>
                  <TableHead>Last contacted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.number}>
                    <TableCell className="font-medium">{r.number}</TableCell>
                    <TableCell>{r.total}</TableCell>
                    <TableCell>{r.minutes}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(r.last), { addSuffix: true })}
                      <span className="ml-2 text-xs">
                        ({format(new Date(r.last), "MMM d")})
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {!calls.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nothing here yet.
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
