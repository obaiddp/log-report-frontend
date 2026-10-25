import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { colorFor } from "./chart-colors";
import { labelWithCount } from "./types";

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
  height = 280,
  total,
  unit = "items",
}: DonutChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0);
  const computedTotal = total ?? data.reduce((sum, d) => sum + d.value, 0);

  // Prepare colored data with consistent status colors
  const coloredData = data.map((entry, index) => ({
    ...entry,
    color: colorFor(entry.name, index).bg,
    textColor: colorFor(entry.name, index).text,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value, color, textColor } = payload[0].payload;
      return (
        <div
          className="bg-card border border-border p-2 rounded-lg shadow-sm text-sm"
          style={{ borderLeft: `3px solid ${color}` }}
        >
          <p
            className="text-muted-foreground"
            style={{ color: textColor }}
          >
            {String(name ?? "Unknown")}
          </p>
          <p className="font-semibold text-foreground">
            {labelWithCount(null, Number(value))}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => (
    <div className="flex flex-wrap gap-2 mt-3 justify-center">
      {payload.map((entry: any, index: number) => {
        const color = colorFor(entry.value, index).bg;
        const textColor = colorFor(entry.value, index).text;
        const value = data.find((d) => d.name === entry.value)?.value ?? 0;
        return (
          <div
            key={`legend-${index}`}
            className="flex items-center gap-1.5 text-sm"
            style={{ color: textColor }}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
            />
            <span className="truncate max-w-[140px]">
              {entry.value} ({value})
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div role="region" aria-label={title ?? "Status breakdown"}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          {title}
        </h3>
      )}
      {!hasData ? (
        <div className="h-full flex flex-col items-center justify-center text-sm text-muted-foreground">
          <p>No data yet.</p>
        </div>
      ) : (
        <div className="h-[280px] w-full flex flex-col" style={{ height }}>
          <div className="flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={coloredData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) =>
                    percent && percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                  }
                  labelLine={false}
                >
                  {coloredData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  content={<CustomLegend />}
                  layout="vertical"
                  align="center"
                  verticalAlign="bottom"
                  height={60}
                />
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
        </div>
      )}
    </div>
  );
}