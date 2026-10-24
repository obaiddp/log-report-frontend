import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts"

interface TrendChartProps {
  data: Array<{ day: string; total: number }>
  title?: string
  color?: string
  height?: number
}

export function TrendChart({
  data,
  title,
  color = "hsl(var(--primary))",
  height = 220,
}: TrendChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.total > 0)

  return (
    <div id="chart-trend" role="region" aria-label={title ?? "Logs over time"}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      )}
      {!hasData ? (
        <p className="h-full flex items-center justify-center text-sm text-muted-foreground">
          No data yet.
        </p>
      ) : (
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(value: string) => value.slice(5)}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Line
                type="monotone"
                dataKey="total"
                stroke={color}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
