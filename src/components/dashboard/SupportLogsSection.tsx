import { useMemo } from "react"

import {
  getSupportLogDashboard,
  type SupportLogDashboardFilters,
} from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { hasPermission } from "@/lib/permissions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

import { useDashboardSection } from "./useDashboardSection"
import { TrendChart } from "./TrendChart"
import { CategoryBarChart } from "./CategoryBarChart"
import { BarList } from "./BarList"
import { KpiCard } from "./KpiCard"
import type { DashboardFilters } from "./types"
import {
  humanizeSupportLogStatus,
  formatHours,
  type DashboardScope,
} from "./types"

interface SupportLogsSectionProps {
  scope: DashboardScope
  filters: DashboardFilters
  refreshKey: number
}

export function SupportLogsSection({
  scope,
  filters,
  refreshKey,
}: SupportLogsSectionProps) {
  const { user } = useAuth()
  const enabled = hasPermission(user, "dashboard_support_logs")

  const supportFilters: SupportLogDashboardFilters = {
    scope,
    from: filters.from || undefined,
    to: filters.to || undefined,
    department_id: filters.department_id ? Number(filters.department_id) : undefined,
    item_type_id: filters.item_type_id ? Number(filters.item_type_id) : undefined,
    status: filters.status || undefined,
    created_by: filters.created_by ? Number(filters.created_by) : undefined,
    assigned_to: filters.assigned_to ? Number(filters.assigned_to) : undefined,
  }

  const { data, loading, refreshing, error, retry } = useDashboardSection({
    enabled,
    version: refreshKey,
    refreshKey,
    fetch: () => getSupportLogDashboard(supportFilters),
  })

  const dashboard = data
  const summary = dashboard?.summary

  const canSeePeople = scope !== "mine" && hasPermission(user, "dashboard_department_view")

  const trend = useMemo(
    () => dashboard?.trend.map((d) => ({ day: d.day, total: d.total })) ?? [],
    [dashboard]
  )

  const byStatus = useMemo(
    () =>
      (dashboard?.by_status ?? []).map((item) => ({
        name: humanizeSupportLogStatus(item.label as any),
        value: item.total,
      })),
    [dashboard]
  )

  const byDepartment = useMemo(
    () => dashboard?.by_department ?? [],
    [dashboard]
  )
  const byItemType = useMemo(() => dashboard?.by_item_type ?? [], [dashboard])
  const byIssueType = useMemo(() => dashboard?.by_issue_type ?? [], [dashboard])

  const byDepartmentChart = useMemo(
    () => byDepartment.map((d) => ({ name: d.name, value: d.total })),
    [byDepartment]
  )
  const byItemTypeChart = useMemo(
    () => byItemType.map((d) => ({ name: d.name, value: d.total })),
    [byItemType]
  )
  const byIssueTypeChart = useMemo(
    () => byIssueType.map((d) => ({ name: d.name, value: d.total })),
    [byIssueType]
  )

  const byCreator = useMemo(
    () => dashboard?.by_creator ?? [],
    [dashboard]
  )
  const byAssignee = useMemo(
    () => dashboard?.by_assignee ?? [],
    [dashboard]
  )

  const avgHours = summary?.avg_resolution_hours ?? null

  return (
    <section id="support-logs-section" aria-label="Support logs dashboard">
      {!enabled && (
        <div className="rounded-md border border-destructive/20 bg-destructive/50 p-4 text-sm text-destructive">
          You don&apos;t have permission to view support log dashboard data.
        </div>
      )}

      {enabled && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <KpiCard title="Total" value={summary?.total ?? 0} scope="mine" />
            <KpiCard title="Open" value={summary?.open ?? 0} scope="mine" />
            <KpiCard title="Solved" value={summary?.solved ?? 0} scope="mine" />
            <KpiCard title="Last 7 days" value={summary?.last_7_days ?? 0} scope="mine" />
            <KpiCard
              title="Avg resolution"
              value={formatHours(avgHours)}
              subtitle="hours per ticket"
              scope="mine"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Logs over time</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <TrendChart data={trend} title="Logs per day" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By status</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CategoryBarChart data={byStatus} title="Support log status" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By department</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CategoryBarChart data={byDepartmentChart} title="Logs by department" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By item type</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CategoryBarChart data={byItemTypeChart} title="Logs by item type" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By issue type</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CategoryBarChart data={byIssueTypeChart} title="Logs by issue type" />
              </CardContent>
            </Card>
          </div>

          {canSeePeople && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <BarList
                  title="By creator"
                  data={byCreator.map((p) => ({ id: p.id, name: p.name, total: p.total }))}
                  ariaLabel="Support logs by creator"
                />
                <BarList
                  title="By assignee"
                  data={byAssignee.map((p) => ({ id: p.id, name: p.name, total: p.total }))}
                  ariaLabel="Support logs by assignee"
                />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/50 p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  id="btn-retry-support-dashboard"
                  variant="outline"
                  size="sm"
                  onClick={retry}
                  disabled={loading || refreshing}
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {(!enabled || loading) && !error && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      )}
    </section>
  )
}
