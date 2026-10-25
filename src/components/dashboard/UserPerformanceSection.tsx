import { useMemo } from "react";

import { getUserPerformance } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { useDashboardSection } from "./useDashboardSection";
import { formatHours } from "./types";

interface UserPerformanceSectionProps {
  refreshKey: number;
}

export function UserPerformanceSection({ refreshKey }: UserPerformanceSectionProps) {
  const { user } = useAuth();
  const enabled = hasPermission(user, "user_performance");

  const { data, loading, refreshing, error, retry } = useDashboardSection({
    enabled,
    version: refreshKey,
    refreshKey,
    fetch: () => getUserPerformance(),
  });

  const tableData = useMemo(() => {
    return [...(data ?? [])].sort((a, b) => {
      if (b.tickets_assigned !== a.tickets_assigned) {
        return b.tickets_assigned - a.tickets_assigned;
      }
      return a.name.localeCompare(b.name);
    });
  }, [data]);

  const totalWithTickets = (data ?? []).filter((p) => p.tickets_assigned > 0).length;

  // Section header
  const sectionHeader = (
    <div className="flex items-start gap-3 mb-6">
      <div className="inline-flex items-center justify-center size-10 rounded-xl bg-violet-500/10 text-violet-500 shrink-0" aria-hidden="true">
        <Users className="size-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">User performance</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Team productivity metrics: tickets assigned, resolved, and resolution rates.
        </p>
      </div>
    </div>
  );

  return (
    <section id="user-performance-section" aria-label="User performance">
      {!enabled && (
        <div className="rounded-md border border-destructive/20 bg-destructive/50 p-4 text-sm text-destructive">
          You don&apos;t have permission to view user performance data.
        </div>
      )}

      {enabled && (
        <>
          {sectionHeader}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All-time performance</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <Skeleton className="h-40 w-full" />
              ) : error ? (
                <div className="flex flex-col items-start gap-2 py-10">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    id="btn-retry-user-performance"
                    variant="outline"
                    size="sm"
                    onClick={retry}
                    disabled={loading || refreshing}
                  >
                    Retry
                  </Button>
                </div>
              ) : tableData.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No performance data yet.
                </p>
              ) : (
                <>
                  <div
                    id="user-performance-table"
                    className="overflow-x-auto border rounded-md"
                  >
                    <Table>
                      <caption className="sr-only">User performance</caption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Tickets Assigned</TableHead>
                          <TableHead className="text-right">Tickets Resolved</TableHead>
                          <TableHead className="text-right">Resolution rate</TableHead>
                          <TableHead className="text-right">Avg Resolution Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableData.map((p) => (
                          <TableRow key={p.user_id} id={`perf-row-${p.user_id}`}>
                            <TableCell className="font-medium truncate">
                              {p.name}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {p.tickets_assigned}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {p.tickets_resolved}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {p.tickets_assigned === 0
                                ? "—"
                                : `${Math.round((p.tickets_resolved / p.tickets_assigned) * 100)}%`}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatHours(p.avg_resolution_hours)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {totalWithTickets > tableData.length && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Showing {tableData.length} of {totalWithTickets}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {(!enabled || loading) && !error && (
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
    </section>
  );
}