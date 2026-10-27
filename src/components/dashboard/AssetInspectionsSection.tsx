import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Clock, AlertTriangle, CheckCircle, XCircle, FileText, ArrowDownLeft } from "lucide-react";

import {
  getAssetInspectionDashboard,
  type AssetInspectionDashboardFilters,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { useDashboardSection } from "./useDashboardSection";
import { SectionFilterBar } from "./SectionFilterBar";
import { ChartErrorBoundary } from "./ChartErrorBoundary";
import { TrendChart } from "./TrendChart";
import { CategoryBarChart } from "./CategoryBarChart";
import { DonutChart } from "./DonutChart";
import { KpiCard } from "./KpiCard";
import { PeopleTable } from "./PeopleTable";
import type { DashboardFilters } from "./types";
import {
  humanizeApprovalStatus,
  humanizeAssetItemStatus,
  formatHours,
  type DashboardScope,
} from "./types";
import type { DashboardReferenceData } from "./useDashboardReferenceData";

interface AssetInspectionsSectionProps {
  scope: DashboardScope;
  filters: DashboardFilters;
  refreshKey: number;
  /** Commits this section's filter edits (the page routes them). */
  onFilterChange: (next: Partial<DashboardFilters>) => void;
  /** Shared reference lists, loaded once for the whole page. */
  reference: DashboardReferenceData;
  /** Lets the page pause auto-refresh while the filter popup is open. */
  onFiltersOpenChange?: (open: boolean) => void;
}

export function AssetInspectionsSection({
  scope,
  filters,
  refreshKey,
  onFilterChange,
  reference,
  onFiltersOpenChange,
}: AssetInspectionsSectionProps) {
  const { user } = useAuth();
  const enabled = hasPermission(user, "dashboard_asset_inspections");

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
  };

  const { data, loading, refreshing, error, retry } = useDashboardSection({
    enabled,
    version: refreshKey,
    refreshKey,
    fetch: () => getAssetInspectionDashboard(assetFilters),
  });

  const dashboard = data;
  const summary = dashboard?.summary;

  const canSeePeople = scope !== "mine" && hasPermission(user, "dashboard_department_view");

  const trend = useMemo(
    () => dashboard?.trend.map((d) => ({ day: d.day, total: d.total })) ?? [],
    [dashboard]
  );

  // Approval rows are { label, total } where label may be null. Drop empty
  // rows and always produce a real name for the donut.
  const byApprovalStatus = useMemo(
    () =>
      (dashboard?.by_approval_status ?? [])
        .filter((item) => item.total > 0)
        .map((item) => ({
          name: humanizeApprovalStatus(item.label),
          value: item.total,
        })),
    [dashboard]
  );

  // Item status rows can carry a null label too; humanizeAssetItemStatus is
  // a filter-select helper (its empty label is "All item statuses"), so the
  // null case is handled here instead.
  const byItemStatus = useMemo(
    () =>
      (dashboard?.by_item_status ?? [])
        .filter((item) => item.total > 0)
        .map((item) => ({
          name: item.label ? humanizeAssetItemStatus(item.label) : "Unknown",
          value: item.total,
        })),
    [dashboard]
  );

  const byDepartment = useMemo(() => dashboard?.by_department ?? [], [dashboard]);
  const byItemType = useMemo(() => dashboard?.by_item_type ?? [], [dashboard]);

  const byDepartmentChart = useMemo(
    () => byDepartment.map((d) => ({ name: d.name, value: d.total })),
    [byDepartment]
  );
  const byItemTypeChart = useMemo(
    () => byItemType.map((d) => ({ name: d.name, value: d.total })),
    [byItemType]
  );

  const byPreparer = useMemo(() => dashboard?.by_preparer ?? [], [dashboard]);
  const byApprover = useMemo(() => dashboard?.by_approver ?? [], [dashboard]);

  const needsMySignature = summary?.needs_my_signature ?? 0;
  const returnedToMe = summary?.returned_to_me ?? 0;
  const avgHours = summary?.avg_approval_hours ?? null;

  return (
    <section id="asset-inspections-section" aria-label="Asset inspections dashboard">
      {!enabled && (
        <div className="rounded-md border border-destructive/20 bg-destructive/50 p-4 text-sm text-destructive">
          You don&apos;t have permission to view asset inspection dashboard data.
        </div>
      )}

      {enabled && (
        <>
          <SectionFilterBar
            section="asset"
            idPrefix="asset-filters"
            scope={scope}
            filters={filters}
            onChange={onFilterChange}
            reference={reference}
            onOpenChange={onFiltersOpenChange}
          />

          {/* KPI Cards - First row */}
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
            <KpiCard
              title="Total"
              value={summary?.total ?? 0}
              icon={ClipboardCheck}
              accent="primary"
              aria-label="Total inspections"
            />
            <KpiCard
              title="Pending"
              value={summary?.pending ?? 0}
              icon={AlertTriangle}
              accent="amber"
              aria-label="Pending inspections"
            />
            <KpiCard
              title="Returned"
              value={summary?.returned ?? 0}
              icon={XCircle}
              accent="red"
              aria-label="Returned inspections"
            />
            <KpiCard
              title="Completed"
              value={summary?.completed ?? 0}
              icon={CheckCircle}
              accent="green"
              aria-label="Completed inspections"
            />
            <KpiCard
              title="Avg approval"
              value={formatHours(avgHours)}
              subtitle="hours per inspection"
              icon={Clock}
              accent="violet"
              aria-label="Average approval time"
            />
          </div>

          {/* Charts */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 mb-6">
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                <ChartErrorBoundary title="Inspections per day">
                  <TrendChart
                    data={trend}
                    title="Inspections per day"
                    colorIndex={0}
                    from={filters.from}
                    to={filters.to}
                  />
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <ChartErrorBoundary title="Approval status">
                  <DonutChart
                    data={byApprovalStatus}
                    title="Approval status"
                    total={summary?.total}
                    unit="inspections"
                  />
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <ChartErrorBoundary title="Item status">
                  <DonutChart
                    data={byItemStatus}
                    title="Item status"
                    total={summary?.total}
                    unit="inspections"
                  />
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <ChartErrorBoundary title="Inspections by department">
                  <CategoryBarChart
                    data={byDepartmentChart}
                    title="Inspections by department"
                    colorIndex={1}
                    unit="inspections"
                  />
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <ChartErrorBoundary title="Inspections by item type">
                  <CategoryBarChart
                    data={byItemTypeChart}
                    title="Inspections by item type"
                    colorIndex={2}
                    unit="inspections"
                  />
                </ChartErrorBoundary>
              </CardContent>
            </Card>
          </div>

          {/* Personal KPIs */}
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Link to="/asset-inspections" aria-label="View inspections needing my signature">
              <KpiCard
                title="Needs my signature"
                value={needsMySignature}
                icon={FileText}
                accent="amber"
                highlightWhenPositive
                aria-label="Inspections needing my signature"
              />
            </Link>
            <Link to="/asset-inspections" aria-label="View inspections returned to me">
              <KpiCard
                title="Returned to me"
                value={returnedToMe}
                icon={ArrowDownLeft}
                accent="red"
                highlightWhenPositive
                aria-label="Inspections returned to me"
              />
            </Link>
          </div>

          {canSeePeople && (
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <ChartErrorBoundary title="By preparer">
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
              </ChartErrorBoundary>
              <ChartErrorBoundary title="By approver">
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
              </ChartErrorBoundary>
            </div>
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
          <Skeleton className="h-[280px] lg:col-span-3 rounded-lg" />
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-20 rounded-lg md:col-span-2" />
          <Skeleton className="h-20 rounded-lg md:col-span-2" />
        </div>
      )}
    </section>
  );
}