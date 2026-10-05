import { useEffect, useMemo, useState } from "react";
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
  type SupportLog,
  type SupportLogStatus,
} from "@/lib/api";
import { canViewAllLogs } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<SupportLogStatus, string> = {
  indoor_repairing: "Indoor Repairing",
  outdoor_repairing: "Outdoor Repairing",
  solved: "Solved",
};

const STATUS_COLORS: Record<SupportLogStatus, string> = {
  indoor_repairing: "#D97706",
  outdoor_repairing: "#64748B",
  solved: "#78A03F",
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const response = await getSupportLogs();
        setLogs(response.data);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Failed to load support logs."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const fullAccess = canViewAllLogs(user);

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

  const counts = useMemo(() => {
    const byStatus: Record<SupportLogStatus, number> = {
      indoor_repairing: 0,
      outdoor_repairing: 0,
      solved: 0,
    };
    for (const log of scopedLogs) {
      byStatus[log.status] += 1;
    }
    return { total: scopedLogs.length, ...byStatus };
  }, [scopedLogs]);

  const byDepartment = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of scopedLogs) {
      const name = log.department?.name ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    return Array.from(map, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count
    );
  }, [scopedLogs]);

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
    const map = new Map<string, number>();
    for (const log of scopedLogs) {
      const day = log.issue_date.split("T")[0];
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return Array.from(map, ([date, count]) => ({ date, count })).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }, [scopedLogs]);

  const recentLogs = useMemo(
    () =>
      [...scopedLogs]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5),
    [scopedLogs]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </p>
    );
  }

  const statCards = [
    { label: "Total logs", value: counts.total, accent: "text-foreground" },
    { label: "Indoor Repairing", value: counts.indoor_repairing, accent: "text-[#D97706]" },
    { label: "Outdoor Repairing", value: counts.outdoor_repairing, accent: "text-[#64748B]" },
    { label: "Solved", value: counts.solved, accent: "text-[#5C7D2E]" },
  ];

  return (
    <div className="space-y-6">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-5">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className={`mt-1 text-3xl font-semibold tabular-nums ${card.accent}`}>
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
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DA" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#78A03F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs by status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
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
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Logs over time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={overTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E3DA" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#78A03F" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
            <ul className="divide-y divide-border">
              {recentLogs.map((log) => (
                <li key={log.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {log.ticket_number} · {log.initiated_by}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {log.department?.name ?? "Unknown department"} ·{" "}
                      {log.issue_date.split("T")[0]}
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
