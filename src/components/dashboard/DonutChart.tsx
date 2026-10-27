import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

import { colorFor } from "./chart-colors";

interface DonutChartProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
  height?: number;
  /** Total to show in the center (defaults to sum of values) */
  total?: number;
  /** Unit label for the center total (e.g., "tickets", "inspections") */
  unit?: string;
}

export function DonutChart({
  data,
  title,
  height = 240,
  total,
  unit = "items",
}: DonutChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0);
  const computedTotal = total ?? data.reduce((sum, d) => sum + d.value, 0);
  const sliceSum = data.reduce((sum, d) => sum + d.value, 0);

  // Prepare colored data with consistent status colors. Unknown statuses
  // fall back to the palette by index.
  const coloredData = data.map((entry, index) => ({
    ...entry,
    color: colorFor(entry.name, index).bg,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      return (
        <div className="bg-card border border-border p-2 rounded-lg shadow-sm text-sm">
          <p className="text-muted-foreground">{String(name ?? "Unknown")}</p>
          <p className="font-semibold text-foreground">
            {Number(value)} {unit}
          </p>
        </div>
      );
    }
    return null;
  };

  // The legend is built from the chart data itself (not recharts' legend
  // payload), so every entry always shows the real name, its count and its
  // share — no "value (0)" fallback entries.
  const legend = (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {coloredData.map((entry, index) => {
        const share =
          sliceSum > 0 ? Math.round((entry.value / sliceSum) * 100) : 0;
        const name = String(entry.name ?? "Unknown");
        return (
          <li
            key={`legend-${index}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="max-w-[180px] truncate" title={name}>
              {name} ({entry.value} · {share}%)
            </span>
          </li>
        );
      })}
    </ul>
  );

  return (
    <div role="region" aria-label={title ?? "Status breakdown"}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          {title}
        </h3>
      )}
      {!hasData ? (
        <div
          className="flex flex-col items-center justify-center text-sm text-muted-foreground"
          style={{ height }}
        >
          <p>No data yet.</p>
        </div>
      ) : (
        <>
          {/*
            No slice labels on the ring: they are what used to overflow and
            get cut off at the box edges. Name, count and share live in the
            legend below; the tooltip shows the same on hover.
          */}
          <div className="relative w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={coloredData}
                  cx="50%"
                  cy="50%"
                  // Percentage radii keep the ring inside the box at every
                  // container size, so the ring can never overflow.
                  innerRadius="58%"
                  outerRadius="88%"
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  labelLine={false}
                >
                  {coloredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
              aria-hidden="true"
            >
              <p className="text-3xl font-bold tabular-nums text-foreground">
                {computedTotal}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{unit}</p>
            </div>
          </div>
          {legend}
        </>
      )}
    </div>
  );
}