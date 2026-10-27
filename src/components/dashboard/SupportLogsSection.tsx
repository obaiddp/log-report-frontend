import { useMemo } from "react";

import {
  getSupportLogDashboard,
  type SupportLogDashboardFilters,
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
import { BarList } from "./BarList";
import type { DashboardFilters } from "./types";
import { humanizeSupportLogStatus, type DashboardScope } from "./types";
import type { DashboardReferenceData } from "./useDashboardReferenceData";

interface SupportLogsSectionProps {
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

export function SupportLogsSection({
  scope,
  filters,
  refreshKey,
  onFilterChange,
  reference,
  onFiltersOpenChange,
}: SupportLogsSectionProps) {
  const { user } = useAuth();
  const enabled = hasPermission(user, "dashboard_support_logs");

  const supportFilters: SupportLogDashboardFilters = {
    scope,
    from: filters.from || undefined,
    to: filters.to || undefined,
    department_id: filters.department_id ? Number(filters.department_id) : undefined,
    item_type_id: filters.item_type_id ? Number(filters.item_type_id) : undefined,
    status: filters.status || undefined,
    created_by: filters.created_by ? Number(filters.created_by) : undefined,
    assigned_to: filters.assigned_to ? Number(filters.assigned_to) : undefined,
  };

  const { data, loading, refreshing, error, retry } = useDashboardSection({
    enabled,
    version: refreshKey,
    refreshKey,
    fetch: () => getSupportLogDashboard(supportFilters),
  });

  const dashboard = data;
  const summary = dashboard?.summary;

  const canSeePeople = scope !== "mine" && hasPermission(user, "dashboard_department_view");

  const trend = useMemo(
    () => dashboard?.trend.map((d) => ({ day: d.day, total: d.total })) ?? [],
    [dashboard]
  );

  // Status-like breakdown rows are { label, total } where label may be null
  // or a status the UI has never seen. humanizeSupportLogStatus always
  // returns a real string, and empty rows are dropped so the donut legend
  // only lists slices that exist.
  const byStatus = useMemo(
    () =>
      (dashboard?.by_status ?? [])
        .filter((item) => item.total > 0)
        .map((item) => ({
          name: humanizeSupportLogStatus(item.label),
          value: item.total,
        })),
    [dashboard]
  );

  const byDepartment = useMemo(() => dashboard?.by_department ?? [], [dashboard]);
  const byItemType = useMemo(() => dashboard?.by_item_type ?? [], [dashboard]);
  const byIssueType = useMemo(() => dashboard?.by_issue_type ?? [], [dashboard]);

  // Named breakdown rows are { id, name, total } — mapped explicitly to
  // chart shape before they reach any chart component.
  const byDepartmentChart = useMemo(
    () => byDepartment.map((d) => ({ name: d.name, value: d.total })),
    [byDepartment]
  );
  const byItemTypeChart = useMemo(
    () => byItemType.map((d) => ({ name: d.name, value: d.total })),
    [byItemType]
  );
  const byIssueTypeChart = useMemo(
    () => byIssueType.map((d) => ({ name: d.name, value: d.total })),
    [byIssueType]
  );

  const byCreator = useMemo(() => dashboard?.by_creator ?? [], [dashboard]);
  const byAssignee = useMemo(() => dashboard?.by_assignee ?? [], [dashboard]);

  return (
    <section id="support-logs-section" aria-label="Support logs dashboard">
      {!enabled && (
        <div className="rounded-md border border-destructive/20 bg-destructive/50 p-4 text-sm text-destructive">
          You don&apos;t have permission to view support log dashboard data.
        </div>
      )}

      {enabled && (
        <>
          <SectionFilterBar
            section="support"
            idPrefix="support-filters"
            scope={scope}
            filters={filters}
            onChange={onFilterChange}
            reference={reference}
            onOpenChange={onFiltersOpenChange}
          />

          {/* {sectionHeader} */}

          {/* KPI Cards ---- keeping these commented for now */}
          {/* <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-6">
            <KpiCard
              title="Total"
              value={summary?.total ?? 0}
              icon={TicketPlus}
              accent="primary"
              aria-label="Total tickets"
            />
            <KpiCard
              title="Open"
              value={summary?.open ?? 0}
              icon={AlertTriangle}
              accent="amber"
              aria-label="Open tickets"
            />
            <KpiCard
              title="Solved"
              value={summary?.solved ?? 0}
              icon={CheckCircle}
              accent="green"
              aria-label="Solved tickets"
            />
            <KpiCard
              title="Last 7 days"
              value={summary?.last_7_days ?? 0}
              icon={FileText}
              accent="blue"
              aria-label="Tickets in last 7 days"
            />
            <KpiCard
              title="Avg resolution"
              value={formatHours(avgHours)}
              subtitle="hours per ticket"
              icon={Clock}
              accent="violet"
              aria-label="Average resolution time"
            />
          </div> */}

          {/* Charts */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 mb-6">
            <Card className="lg:col-span-2">
              <CardContent className="p-4">
                <ChartErrorBoundary title="Logs per day">
                  <TrendChart
                    data={trend}
                    title="Logs per day"
                    colorIndex={0}
                    from={filters.from}
                    to={filters.to}
                  />
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <ChartErrorBoundary title="Status breakdown">
                  <DonutChart
                    data={byStatus}
                    title="Status breakdown"
                    total={summary?.total}
                    unit="tickets"
                  />
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <ChartErrorBoundary title="Logs by department">
                  <CategoryBarChart
                    data={byDepartmentChart}
                    title="Logs by department"
                    colorIndex={1}
                    unit="tickets"
                  />
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <ChartErrorBoundary title="Logs by item type">
                  <CategoryBarChart
                    data={byItemTypeChart}
                    title="Logs by item type"
                    colorIndex={2}
                    unit="tickets"
                  />
                </ChartErrorBoundary>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <ChartErrorBoundary title="Logs by issue type">
                  <CategoryBarChart
                    data={byIssueTypeChart}
                    title="Logs by issue type"
                    colorIndex={3}
                    unit="tickets"
                  />
                </ChartErrorBoundary>
              </CardContent>
            </Card>
          </div>

          {canSeePeople && (
            <div className="grid gap-4 md:grid-cols-2 mb-6">
              <ChartErrorBoundary title="By creator">
                <BarList
                  title="By creator"
                  data={byCreator.map((p) => ({ id: p.id, name: p.name, total: p.total }))}
                  ariaLabel="Support logs by creator"
                />
              </ChartErrorBoundary>
              <ChartErrorBoundary title="By assignee">
                <BarList
                  title="By assignee"
                  data={byAssignee.map((p) => ({ id: p.id, name: p.name, total: p.total }))}
                  ariaLabel="Support logs by assignee"
                />
              </ChartErrorBoundary>
            </div>
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
          <Skeleton className="h-[280px] lg:col-span-3 rounded-lg" />
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-[280px] rounded-lg" />
          <Skeleton className="h-[280px] rounded-lg" />
        </div>
      )}
    </section>
  );
}