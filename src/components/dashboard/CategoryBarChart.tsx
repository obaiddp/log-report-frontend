import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

import { fillColorFor } from "./chart-colors";
import { labelWithCount } from "./types";

interface CategoryBarChartProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
  height?: number;
  colorIndex?: number;
  /** Unit for value labels (e.g., "tickets", "inspections") */
  unit?: string;
}

function formatLabel(value: unknown, unit: string): string {
  if (value === undefined || value === null || value === false) return "";
  return `${Number(value)}${unit ? ` ${unit}` : ""}`;
}

export function CategoryBarChart({
  data,
  title,
  height = 280,
  colorIndex = 0,
  unit = "",
}: CategoryBarChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0);
  const color = fillColorFor("", colorIndex);
  const sorted = [...data].sort((a, b) => b.value - a.value);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      return (
        <div className="bg-card border border-border p-2 rounded-lg shadow-sm text-sm">
          <p className="text-muted-foreground">{String(name ?? "Unknown")}</p>
          <p className="font-semibold text-foreground">
            {labelWithCount(null, Number(value))}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate max value for axis domain with padding for labels
  const maxValue = sorted.length > 0 ? Math.max(...sorted.map((d) => d.value)) : 0;
  const domainPadding = maxValue * 0.15;

  return (
    <div role="region" aria-label={title ?? "Distribution"}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      )}
      {!hasData ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
          <p>No data yet.</p>
        </div>
      ) : (
        <div className="h-[280px] w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={sorted} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={false} stroke="currentColor" strokeOpacity={0.1} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                width={160}
                tickMargin={8}
                tickFormatter={(value: string) => value}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: "var(--muted-foreground)" }}
                domain={[0, maxValue + domainPadding]}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ strokeDasharray: "3 3", stroke: "currentColor", strokeOpacity: 0.2 }}
              />
              <Bar
                dataKey="value"
                fill={color}
                radius={[0, 4, 4, 0]}
                maxBarSize={28}
              >
                {sorted.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  offset={8}
                  fontSize={11}
                  fontWeight={500}
                  fill="var(--foreground)"
                  formatter={(value) => formatLabel(value, unit)}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}