import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface Props {
  usedMinutes: number;
  limitMinutes: number;
  label?: string;
}

export function UsageDonut({ usedMinutes, limitMinutes, label = "Minutes used" }: Props) {
  const used = Math.max(0, Math.min(usedMinutes, limitMinutes));
  const remaining = Math.max(0, limitMinutes - used);
  const pct = limitMinutes > 0 ? Math.round((used / limitMinutes) * 100) : 0;
  const data = [
    { name: "used", value: used },
    { name: "remaining", value: remaining || 1 },
  ];
  const colors = ["hsl(var(--primary))", "hsl(var(--muted))"];

  return (
    <div className="relative h-44">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius={60}
            outerRadius={80}
            startAngle={210}
            endAngle={-30}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={colors[i]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-2xl font-semibold tabular-nums">{used.toFixed(0)}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {pct}% of {limitMinutes.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
