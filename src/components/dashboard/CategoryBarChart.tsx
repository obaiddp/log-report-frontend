import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

import { labelWithCount } from "./types"

const CATEGORY_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary-hover))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
]

interface CategoryBarChartProps {
  data: Array<{ name: string; value: number }>
  title?: string
  height?: number
  colorIndex?: number
  horizontal?: boolean
}

export function CategoryBarChart({
  data,
  title,
  height = 220,
  colorIndex = 0,
  horizontal = false,
}: CategoryBarChartProps) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0)
  const color = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length]
  const sorted = [...data].sort((a, b) => b.value - a.value)

  return (
    <div role="region" aria-label={title ?? "Distribution"}>
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      )}
      {!hasData ? (
        <p className="h-full flex items-center justify-center text-sm text-muted-foreground">
          No data yet.
        </p>
      ) : (
        <div className="h-[220px] w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={sorted} layout={horizontal ? "vertical" : "horizontal"}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              {!horizontal ? (
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value: string) => value}
                />
              ) : (
                <YAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(value: string) => value}
                />
              )}
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const { name, value } = payload[0].payload
                    return (
                      <div className="bg-card border border-border p-2 rounded-lg shadow-sm text-sm">
                        <p className="text-muted-foreground">{String(name ?? "Unknown")}</p>
                        <p className="font-semibold text-foreground">{labelWithCount(null, Number(value))}</p>
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]}>
                {sorted.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
