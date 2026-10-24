import { useMemo } from "react"
import { Link } from "react-router-dom"

import {
  getAssetInspectionDashboard,
  type AssetInspectionDashboardFilters,
  type AssetApprovalStatus,
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
import { KpiCard } from "./KpiCard"
import { PeopleTable } from "./PeopleTable"
import type { DashboardFilters } from "./types"
import {
  humanizeApprovalStatus,
  humanizeAssetItemStatus,
  formatHours,
  type DashboardScope,
} from "./types"

interface AssetInspectionsSectionProps {
  scope: DashboardScope
  filters: DashboardFilters
  refreshKey: number
}

export function AssetInspectionsSection({
  scope,
  filters,
  refreshKey,
}: AssetInspectionsSectionProps) {
  const { user } = useAuth()
  const enabled = hasPermission(user, "dashboard_asset_inspections")

  const assetFilters: AssetInspectionDashboardFilters = {
    scope,
    from: filters.from || undefined,
    to: filters.to || undefined,
    department_id: filters.department_id ? Number(filters.department_id) : undefined,
    item_type_id: filters.item_type_id ? Number(filters.item_type_id) : undefined,
    status: filters.asset_status || undefined,
    approval_status: filters.approval_status || undefined,
    prepared_by: filters.prepared_by ? Number(filters.prepared_by) : undefined,
    admin_user: filters.admin_user ? Number(filters.admin_user) : undefined,
  }

  const { data, loading, refreshing, error, retry } = useDashboardSection({
    enabled,
    version: refreshKey,
    refreshKey,
    fetch: () => getAssetInspectionDashboard(assetFilters),
  })

  const dashboard = data
  const summary = dashboard?.summary

  const canSeePeople = scope !== "mine" && hasPermission(user, "dashboard_department_view")

  const trend = useMemo(
    () => dashboard?.trend.map((d) => ({ day: d.day, total: d.total })) ?? [],
    [dashboard]
  )

  const byApprovalStatus = useMemo(
    () =>
      (dashboard?.by_approval_status ?? []).map((item) => ({
        name: humanizeApprovalStatus(item.label as AssetApprovalStatus),
        value: item.total,
      })),
    [dashboard]
  )
  const byItemStatus = useMemo(
    () =>
      (dashboard?.by_item_status ?? []).map((item) => ({
        name: humanizeAssetItemStatus(item.label),
        value: item.total,
      })),
    [dashboard]
  )
  const byDepartment = useMemo(() => dashboard?.by_department ?? [], [dashboard])
  const byItemType = useMemo(() => dashboard?.by_item_type ?? [], [dashboard])

  const byDepartmentChart = useMemo(
    () => byDepartment.map((d) => ({ name: d.name, value: d.total })),
    [byDepartment]
  )
  const byItemTypeChart = useMemo(
    () => byItemType.map((d) => ({ name: d.name, value: d.total })),
    [byItemType]
  )

  const byPreparer = useMemo(
    () => dashboard?.by_preparer ?? [],
    [dashboard]
  )
  const byApprover = useMemo(
    () => dashboard?.by_approver ?? [],
    [dashboard]
  )

  const needsMySignature = summary?.needs_my_signature ?? 0
  const returnedToMe = summary?.returned_to_me ?? 0
  const avgHours = summary?.avg_approval_hours ?? null

  return (
    <section id="asset-inspections-section" aria-label="Asset inspections dashboard">
      {!enabled && (
        <div className="rounded-md border border-destructive/20 bg-destructive/50 p-4 text-sm text-destructive">
          You don&apos;t have permission to view asset inspection dashboard data.
        </div>
      )}

      {enabled && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <KpiCard title="Total" value={summary?.total ?? 0} scope="mine" />
            <KpiCard title="Pending" value={summary?.pending ?? 0} scope="mine" />
            <KpiCard title="Returned" value={summary?.returned ?? 0} scope="mine" />
            <KpiCard title="Completed" value={summary?.completed ?? 0} scope="mine" />
            <KpiCard
              title="Avg approval"
              value={formatHours(avgHours)}
              subtitle="hours per inspection"
              scope="mine"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2 md:col-span-3 lg:col-span-5">
              <CardHeader>
                <CardTitle className="text-base">Inspections over time</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <TrendChart data={trend} title="Inspections per day" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By approval status</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CategoryBarChart data={byApprovalStatus} title="Inspections by approval" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By item status</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CategoryBarChart data={byItemStatus} title="Inspections by item status" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By department</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CategoryBarChart data={byDepartmentChart} title="Inspections by department" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By item type</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <CategoryBarChart data={byItemTypeChart} title="Inspections by item type" />
              </CardContent>
            </Card>
          </div>

          {/* Personal KPIs */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Needs my signature
                  </p>
                  <p className="text-xs text-muted-foreground truncate" title="Personal - ignores scope and filters">
                    Personal
                  </p>
                </div>
                <Link
                  to="/asset-inspections"
                  className="text-3xl font-semibold tabular-nums text-primary-hover hover:underline min-h-[44px] flex items-center"
                >
                  {needsMySignature}
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Returned to me
                  </p>
                  <p className="text-xs text-muted-foreground truncate" title="Personal - ignores scope and filters">
                    Personal
                  </p>
                </div>
                <Link
                  to="/asset-inspections"
                  className="text-3xl font-semibold tabular-nums text-primary-hover hover:underline min-h-[44px] flex items-center"
                >
                  {returnedToMe}
                </Link>
              </CardContent>
            </Card>
          </div>

          {canSeePeople && (
            <>
              <PeopleTable
                title="By preparer"
                data={byPreparer.map((p) => ({
                  id: p.id,
                  name: p.name,
                  total: p.total,
                  pending: p.pending,
                  returned: p.returned,
                  completed: p.completed,
                }))}
                ariaLabel="Asset inspections by preparer"
              />
              <PeopleTable
                title="By approver"
                data={byApprover.map((p) => ({
                  id: p.id,
                  name: p.name,
                  total: p.total,
                  pending: p.pending,
                  returned: p.returned,
                  completed: p.completed,
                }))}
                ariaLabel="Asset inspections by approver"
              />
            </>
          )}

          {error && (
            <div className="rounded-md border border-destructive/20 bg-destructive/50 p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <p className="text-sm text-destructive">{error}</p>
                <Button
                  id="btn-retry-asset-dashboard"
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
