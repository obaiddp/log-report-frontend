import { Card, CardContent } from "@/components/ui/card"
import type { DashboardScope } from "./types"

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  scope?: DashboardScope
  "aria-label"?: string
}

export function KpiCard({
  title,
  value,
  subtitle,
  scope,
  "aria-label": ariaLabel,
}: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-xs font-medium text-muted-foreground truncate"
              title={title}
            >
              {title}
            </p>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate" title={subtitle}>
                {subtitle}
              </p>
            )}
            {scope && (
              <span className="mt-2 inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {scope}
              </span>
            )}
          </div>
          <p
            className="text-3xl font-semibold tabular-nums text-foreground"
            id={ariaLabel ? `kpi-${ariaLabel.toLowerCase().replace(/\s+/g, "-")}` : undefined}
          >
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
