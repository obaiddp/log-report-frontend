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

interface CategoryBarChartProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
  height?: number;
  colorIndex?: number;
  /** Unit for value labels (e.g., "tickets", "inspections") */
  unit?: string;
}

/** Category names longer than this are truncated (full name in tooltip). */
const MAX_TICK_CHARS = 18;

function truncateTick(value: unknown): string {
  const text = String(value ?? "");
  if (text.length <= MAX_TICK_CHARS) return text;
  return `${text.slice(0, MAX_TICK_CHARS - 1).trimEnd()}…`;
}

function formatLabel(value: unknown, unit: string): string {
  if (value === undefined || value === null || value === false) return "";
  return `${Number(value)}${unit ? ` ${unit}` : ""}`;
}

export function CategoryBarChart({
  data,
  title,
  height = 240,
  colorIndex = 0,
  unit = "",
}: CategoryBarChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0);
  const color = fillColorFor("", colorIndex);
  const sorted = [...data].sort((a, b) => b.value - a.value);

  // The chart height follows the number of bars instead of a fixed box:
  // two bars no longer float in 280px of empty space, and the chart never
  // grows past the requested height (a laptop viewport stays readable).
  const adaptiveHeight = Math.min(
    Math.max(sorted.length * 44 + 16, 96),
    height
  );

  // The name gutter is sized from the longest (truncated) category name
  // instead of a fixed 160px, so short names like "Hardware" don't waste
  // half of the card width.
  const longestTick = sorted.reduce(
    (max, d) => Math.max(max, truncateTick(d.name).length),
    0
  );
  const yAxisWidth = Math.min(160, Math.max(72, longestTick * 6.6 + 14));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const { name, value } = payload[0].payload;
      return (
        <div className="bg-card border border-border p-2 rounded-lg shadow-sm text-sm">
          <p className="text-muted-foreground">{String(name ?? "Unknown")}</p>
          <p className="font-semibold text-foreground">
            {formatLabel(value, unit)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate max value for axis domain with padding for the bar labels.
  const maxValue = sorted.length > 0 ? Math.max(...sorted.map((d) => d.value)) : 0;
  const domainPadding = maxValue * 0.15;

  return (
    <div role="region" aria-label={title ?? "Distribution"}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      )}
      {!hasData ? (
        <div
          className="flex items-center justify-center text-sm text-muted-foreground"
          style={{ height: adaptiveHeight }}
        >
          <p>No data yet.</p>
        </div>
      ) : (
        <div className="w-full" style={{ height: adaptiveHeight }}>
          <ResponsiveContainer width="100%" height={adaptiveHeight}>
            <BarChart
              data={sorted}
              layout="vertical"
              margin={{ left: 0, right: 8, top: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={true}
                horizontal={false}
                stroke="currentColor"
                strokeOpacity={0.1}
              />
              {/*
                The value axis is hidden: exact values are already printed
                at the end of every bar, so the number scale is noise.
              */}
              <XAxis type="number" hide domain={[0, maxValue + domainPadding]} />
              <YAxis
                type="category"
                dataKey="name"
                width={yAxisWidth}
                tickLine={false}
                axisLine={false}
                fontSize={12}
                tickMargin={8}
                tickFormatter={truncateTick}
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