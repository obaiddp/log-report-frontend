import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { format } from "date-fns";

interface TrendChartProps {
  data: Array<{ day: string; total: number }>;
  title?: string;
  colorIndex?: number;
  height?: number;
  from?: string;
  to?: string;
}

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function TrendChart({
  data,
  title,
  colorIndex = 0,
  height = 280,
  from,
  to,
}: TrendChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.total > 0);

  const { processedData, showBars } = useMemo(() => {
    if (!from || !to) {
      // No date range provided - use data as-is
      return { processedData: data, showBars: data.length <= 3 };
    }

    const startDate = new Date(from);
    const endDate = new Date(to);
    const dataMap = new Map(data.map((d) => [d.day, d.total]));

    const filledData: Array<{ day: string; total: number }> = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dayStr = current.toISOString().split("T")[0];
      filledData.push({
        day: dayStr,
        total: dataMap.get(dayStr) ?? 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return { processedData: filledData, showBars: filledData.length <= 3 };
  }, [data, from, to]);

  const color = CHART_COLORS[colorIndex % CHART_COLORS.length];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const { total } = payload[0].payload;
      const dateLabel = label ? format(new Date(label), "d MMM") : "";
      return (
        <div className="bg-card border border-border p-2 rounded-lg shadow-sm text-sm">
          <p className="text-muted-foreground">{dateLabel}</p>
          <p className="font-semibold text-foreground">Total: {total}</p>
        </div>
      );
    }
    return null;
  };

  const dotProps = {
    r: 4,
    fill: color,
    stroke: "var(--background)",
    strokeWidth: 2,
  };

  return (
    <div id="chart-trend" role="region" aria-label={title ?? "Trend over time"}>
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
            {showBars ? (
              <BarChart data={processedData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value: string) => format(new Date(value), "d MMM")}
                  tick={{ fill: "var(--muted-foreground)" }}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ strokeDasharray: "3 3", stroke: "currentColor", strokeOpacity: 0.2 }}
                />
                <Bar
                  dataKey="total"
                  fill={color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={30}
                />
              </BarChart>
            ) : (
              <AreaChart data={processedData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value: string) => format(new Date(value), "d MMM")}
                  tick={{ fill: "var(--muted-foreground)" }}
                />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} tick={{ fill: "var(--muted-foreground)" }} />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ strokeDasharray: "3 3", stroke: "currentColor", strokeOpacity: 0.2 }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={color}
                  strokeWidth={2}
                  fill={color}
                  fillOpacity={0.15}
                  dot={dotProps}
                  connectNulls={true}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}