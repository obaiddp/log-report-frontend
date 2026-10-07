import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  ApiError,
  getSupportLogs,
  getUserPerformance,
  type SupportLog,
  type SupportLogStatus,
  type UserPerformance,
} from "@/lib/api";
import { canViewAllLogs, canViewUserPerformance } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = {
  indoor: "#D97706",
  outdoor: "#64748B",
  solved: "#78A03F",
  primaryDark: "#5C7D2E",
  grid: "#E5E3DA",
} as const;

const STATUS_LABELS: Record<SupportLogStatus, string> = {
  indoor_repairing: "Indoor Repairing",
  outdoor_repairing: "Outdoor Repairing",
  solved: "Solved",
};

const STATUS_COLORS: Record<SupportLogStatus, string> = {
  indoor_repairing: COLORS.indoor,
  outdoor_repairing: COLORS.outdoor,
  solved: COLORS.solved,
};

type DateRange = "7" | "30" | "all";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  "7": "Last 7 days",
  "30": "Last 30 days",
  all: "All time",
};

function issueDay(log: SupportLog): string {
  return log.issue_date.split("T")[0];
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function formatAvgResolution(hours: number | null): string {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours >= 48) {
    return `${(hours / 24).toFixed(1)} days · ${hours.toFixed(1)} h`;
  }
  return `${hours.toFixed(1)} h`;
}

function StatusPill({ status }: { status: SupportLogStatus }) {
  const classes: Record<SupportLogStatus, string> = {
    indoor_repairing: "bg-status-indoor-bg text-status-indoor-text",
    outdoor_repairing: "bg-status-outdoor-bg text-status-outdoor-text",
    solved: "bg-status-solved-bg text-status-solved-text",
  };

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${classes[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SupportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("all");

  const [performance, setPerformance] = useState<UserPerformance[]>([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState("");

  const canSeePerformance = canViewUserPerformance(user);
  const fullAccess = canViewAllLogs(user);

  const loadLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      setLogsError("");
      const response = await getSupportLogs();
      setLogs(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      setLogsError(
        err instanceof ApiError ? err.message : "Failed to load support logs."
      );
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const loadPerformance = useCallback(async () => {
    if (!canViewUserPerformance(user)) return;
    try {
      setPerformanceLoading(true);
      setPerformanceError("");
      const response = await getUserPerformance();
      setPerformance(response.data);
    } catch (err) {
      setPerformanceError(
        err instanceof ApiError ? err.message : "Failed to load user performance."
      );
    } finally {
      setPerformanceLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    if (!canSeePerformance) return;
    loadPerformance();
  }, [canSeePerformance, loadPerformance]);

  function handleRefresh() {
    loadLogs();
    if (canSeePerformance) {
      loadPerformance();
    }
  }

  // Non-admin roles see only logs they created or that are assigned to them.
  // NOTE: this is a UI scope filter only — the API currently returns all logs
  // to any authenticated user. Server-side scoping is required for privacy.
  const scopedLogs = useMemo(() => {
    if (fullAccess || !user) {
      return logs;
    }
    return logs.filter(
      (log) => log.created_by === user.id || log.assigned_to === user.id
    );
  }, [logs, user, fullAccess]);

  const filteredLogs = useMemo(() => {
    if (dateRange === "all") return scopedLogs;

    const days = Number(dateRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const cutoffDay = cutoff.toISOString().split("T")[0];

    return scopedLogs.filter((log) => issueDay(log) >= cutoffDay);
  }, [scopedLogs, dateRange]);

  const counts = useMemo(() => {
    const byStatus: Record<SupportLogStatus, number> = {
      indoor_repairing: 0,
      outdoor_repairing: 0,
      solved: 0,
    };
    for (const log of filteredLogs) {
      byStatus[log.status] += 1;
    }
    return { total: filteredLogs.length, ...byStatus };
  }, [filteredLogs]);

  const unassignedCount = useMemo(
    () => filteredLogs.filter((log) => log.assigned_to === null).length,
    [filteredLogs]
  );

  const byDepartment = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of filteredLogs) {
      const name = log.department?.name ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count
    );
  }, [filteredLogs]);

  const byStatus = useMemo(
    () =>
      (Object.keys(STATUS_LABELS) as SupportLogStatus[]).map((status) => ({
        name: STATUS_LABELS[status],
        value: counts[status],
        color: STATUS_COLORS[status],
      })),
    [counts]
  );

  const overTime = useMemo(() => {
    const countsByDay = new Map<string, number>();
    for (const log of filteredLogs) {
      const day = issueDay(log);
      countsByDay.set(day, (countsByDay.get(day) ?? 0) + 1);
    }

    if (countsByDay.size === 0) return [];

    const days = Array.from(countsByDay.keys()).sort();
    const start = days[0];
    const end = days[days.length - 1];

    const filled: Array<{ date: string; count: number }> = [];
    const cursor = new Date(`${start}T00:00:00`);
    const last = new Date(`${end}T00:00:00`);

    while (cursor <= last) {
      const key = cursor.toISOString().split("T")[0];
      filled.push({ date: key, count: countsByDay.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    return filled;
  }, [filteredLogs]);

  const recentLogs = useMemo(
    () =>
      [...scopedLogs]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    [scopedLogs]
  );

  const performanceChartData = useMemo(() => {
    return performance
      .filter((p) => p.tickets_assigned > 0)
      .sort((a, b) => b.tickets_assigned - a.tickets_assigned)
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        Assigned: p.tickets_assigned,
        Resolved: p.tickets_resolved,
      }));
  }, [performance]);

  const performanceTotalWithTickets = useMemo(
    () => performance.filter((p) => p.tickets_assigned > 0).length,
    [performance]
  );

  const performanceTableData = useMemo(() => {
    return [...performance].sort((a, b) => {
      if (b.tickets_assigned !== a.tickets_assigned) {
        return b.tickets_assigned - a.tickets_assigned;
      }
      return a.name.localeCompare(b.name);
    });
  }, [performance]);

  const statCards = useMemo(() => {
    const cards = [
      { label: "Total logs", value: counts.total, color: "var(--foreground)" },
      { label: "Indoor Repairing", value: counts.indoor_repairing, color: COLORS.indoor },
      { label: "Outdoor Repairing", value: counts.outdoor_repairing, color: COLORS.outdoor },
      { label: "Solved", value: counts.solved, color: COLORS.primaryDark },
    ];
    if (fullAccess) {
      cards.push({
        label: "Unassigned",
        value: unassignedCount,
        color: "var(--foreground)",
      });
    }
    return cards;
  }, [counts, fullAccess, unassignedCount]);

  if (logsLoading && logs.length === 0) {
    return (
      <div className="space-y-4">
        <div className={`grid gap-4 sm:grid-cols-2 ${fullAccess ? "xl:grid-cols-5" : "lg:grid-cols-4"}`}>
          {Array.from({ length: fullAccess ? 5 : 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  return (
    <div id="dashboard-page" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {fullAccess ? "Dashboard" : "My dashboard"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {fullAccess
              ? "Organisation-wide support log activity."
              : "Logs you created or that are assigned to you."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            id="filter-date-range"
            className="w-36"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
          >
            {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
              <option key={range} value={range}>
                {DATE_RANGE_LABELS[range]}
              </option>
            ))}
          </Select>

          <Button id="btn-refresh-dashboard" variant="outline" size="sm" onClick={handleRefresh}>
            Refresh
          </Button>

          {lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Last updated{" "}
              {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
      </div>

      {logsError && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-destructive/10 px-3 py-2">
          <p className="text-sm text-destructive">{logsError}</p>
          <Button variant="outline" size="sm" onClick={loadLogs}>
            Retry
          </Button>
        </div>
      )}

      <div className={`grid gap-4 sm:grid-cols-2 ${fullAccess ? "xl:grid-cols-5" : "lg:grid-cols-4"}`}>
        {statCards.map((card) => (
          <Card key={card.label} id={`stat-${card.label.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className="mt-1 text-3xl font-semibold tabular-nums" style={{ color: card.color }}>
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs by department</CardTitle>
          </CardHeader>
          <CardContent>
            {byDepartment.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <div id="chart-department" className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byDepartment}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                      tickFormatter={(value: string) => truncate(value, 12)}
                    />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.solved} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs by status</CardTitle>
          </CardHeader>
          <CardContent>
            {counts.total === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <div id="chart-status" className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={byStatus}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      strokeWidth={0}
                    >
                      {byStatus.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logs over time</CardTitle>
        </CardHeader>
        <CardContent>
          {overTime.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">No data yet.</p>
          ) : (
            <div id="chart-over-time" className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={overTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip formatter={(value) => [value, "Logs"]} />
                  <Line type="monotone" dataKey="count" name="Logs" stroke={COLORS.solved} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {canSeePerformance && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workload vs resolved tickets by user</CardTitle>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : performanceError ? (
                <div className="flex flex-col items-start gap-2 py-10">
                  <p className="text-sm text-destructive">{performanceError}</p>
                  <Button variant="outline" size="sm" onClick={loadPerformance}>
                    Retry
                  </Button>
                </div>
              ) : performanceChartData.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  No assigned tickets yet.
                </p>
              ) : (
                <div id="user-performance-chart" className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        fontSize={12}
                        tickFormatter={(value: string) => truncate(value, 12)}
                      />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Assigned" fill={COLORS.outdoor} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Resolved" fill={COLORS.solved} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {performanceChartData.length > 0 &&
                performanceTotalWithTickets > performanceChartData.length && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Showing top {performanceChartData.length} of{" "}
                    {performanceTotalWithTickets}
                  </p>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">User performance</CardTitle>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardHeader>
            <CardContent>
              {performanceLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : performanceError ? (
                <p className="text-sm text-muted-foreground">
                  Performance data unavailable — see the error above.
                </p>
              ) : (
                <div id="user-performance-table" className="overflow-x-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="h-10 px-4 text-left font-medium text-muted-foreground">User</th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">Tickets Assigned</th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">Tickets Resolved</th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">Resolution rate</th>
                        <th className="h-10 px-4 text-right font-medium text-muted-foreground">Avg Resolution Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceTableData.map((p) => (
                        <tr key={p.user_id} className="border-b last:border-0">
                          <td className="p-4">{p.name}</td>
                          <td className="p-4 text-right tabular-nums">{p.tickets_assigned}</td>
                          <td className="p-4 text-right tabular-nums">{p.tickets_resolved}</td>
                          <td className="p-4 text-right tabular-nums">
                            {p.tickets_assigned === 0
                              ? "—"
                              : `${Math.round((p.tickets_resolved / p.tickets_assigned) * 100)}%`}
                          </td>
                          <td className="p-4 text-right tabular-nums">
                            {formatAvgResolution(p.avg_resolution_hours)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent logs</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No support logs yet.
            </p>
          ) : (
            <ul id="recent-logs" className="divide-y divide-border">
              {recentLogs.map((log) => (
                <li key={log.id} id={`recent-log-${log.id}`} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {log.ticket_number} · {log.initiated_by}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {log.department?.name ?? "Unknown department"} ·{" "}
                      {issueDay(log)}
                    </p>
                  </div>
                  <StatusPill status={log.status} />
                </li>
              ))}
            </ul>
          )}
          <Link
            to="/support-logs"
            className="mt-4 inline-block text-sm font-medium text-primary-hover hover:underline"
          >
            View all logs
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
