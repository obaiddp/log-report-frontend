import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";

import {
  ApiError,
  deleteSupportLog,
  getSupportLogs,
  updateSupportLogStatus,
  type SupportLog,
  type SupportLogStatus,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SupportLogForm from "@/components/SupportLogForm";
import { canCreateLogs, canDeleteLogs, canUpdateLogs, canViewAllLogs } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";

const STATUS_LABELS: Record<SupportLogStatus, string> = {
  indoor_repairing: "Indoor Repairing",
  outdoor_repairing: "Outdoor Repairing",
  solved: "Solved",
};

const STATUS_SELECT_CLASSES: Record<SupportLogStatus, string> = {
  indoor_repairing: "bg-status-indoor-bg text-status-indoor-text border-transparent",
  outdoor_repairing: "bg-status-outdoor-bg text-status-outdoor-text border-transparent",
  solved: "bg-status-solved-bg text-status-solved-text border-transparent",
};

function formatStatus(status: string): string {
  switch (status) {
    case "indoor_repairing":
      return "Indoor Repairing";
    case "outdoor_repairing":
      return "Outdoor Repairing";
    case "solved":
      return "Solved";
    default:
      return status;
  }
}

export default function SupportLogsPage() {
  const { user } = useAuth();
  const [supportLogs, setSupportLogs] = useState<SupportLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createdTicket, setCreatedTicket] = useState("");
  const [logToDelete, setLogToDelete] = useState<SupportLog | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadSupportLogs() {
      try {
        setLogsLoading(true);
        setLogsError("");
        const response = await getSupportLogs();
        setSupportLogs(response.data);
      } catch (err) {
        setLogsError(
          err instanceof ApiError ? err.message : "Failed to load support logs."
        );
      } finally {
        setLogsLoading(false);
      }
    }

    loadSupportLogs();
  }, []);

  function handleExport() {
    if (filteredLogs.length === 0) {
      alert("No support logs to export.");
      return;
    }

    const headers = [
      "Ticket",
      "Date",
      "Initiated By",
      "Department",
      "Item",
      "Issue Type",
      "Description",
      "Status",
      "Worked By",
    ];

    const rows = filteredLogs.map((log) => [
      log.ticket_number,
      log.issue_date.split("T")[0],
      log.initiated_by,
      log.department?.name ?? "",
      log.item_type?.name ?? "",
      log.issue_types?.map((issue) => issue.name).join(", ") ?? "",
      log.issue_details ?? "",
      formatStatus(log.status),
      log.assigned_resource?.name ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "support-logs.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleStatusChange(id: number, status: SupportLogStatus) {
    try {
      const response = await updateSupportLogStatus(id, status);
      setSupportLogs((previous) =>
        previous.map((log) => (log.id === id ? response.data : log))
      );
    } catch (err) {
      setLogsError(
        err instanceof ApiError ? err.message : "Failed to update status."
      );
    }
  }

  async function handleConfirmDelete() {
    if (!logToDelete) return;

    try {
      setDeleting(true);
      await deleteSupportLog(logToDelete.id);
      setSupportLogs((previous) =>
        previous.filter((log) => log.id !== logToDelete.id)
      );
      setLogToDelete(null);
    } catch (err) {
      setLogsError(
        err instanceof ApiError ? err.message : "Failed to delete support log."
      );
    } finally {
      setDeleting(false);
    }
  }

  function handleLogCreated(newLog: SupportLog) {
    setSupportLogs((previous) => [newLog, ...previous]);
    setCreateOpen(false);
    setCreatedTicket(newLog.ticket_number);
  }

  // UI scoping only — the API currently returns all logs to every
  // authenticated user. The backend must enforce this server-side.
  const visibleLogs = useMemo(() => {
    if (canViewAllLogs(user) || !user) {
      return supportLogs;
    }
    return supportLogs.filter(
      (log) => log.created_by === user.id || log.assigned_to === user.id
    );
  }, [supportLogs, user]);

  const filteredLogs = visibleLogs.filter((log) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      log.ticket_number.toLowerCase().includes(searchText) ||
      log.initiated_by.toLowerCase().includes(searchText) ||
      log.issue_details?.toLowerCase().includes(searchText) ||
      log.assigned_resource?.name?.toLowerCase().includes(searchText);

    const matchesStatus = !statusFilter || log.status === statusFilter;
    const matchesDepartment =
      !departmentFilter || String(log.department_id) === departmentFilter;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Support Logs</h2>
          <p className="text-sm text-muted-foreground">
            Track and update indoor/outdoor repair tickets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" /> Export CSV
          </Button>
          {canCreateLogs(user) && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> New Log
            </Button>
          )}
        </div>
      </div>

      {createdTicket && (
        <p className="rounded-md bg-status-solved-bg px-3 py-2 text-sm text-status-solved-text">
          Support log created successfully. Ticket: {createdTicket}
        </p>
      )}

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">All logs</CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="Search ticket, initiator, issue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-44"
            >
              <option value="">All statuses</option>
              <option value="indoor_repairing">Indoor Repairing</option>
              <option value="outdoor_repairing">Outdoor Repairing</option>
              <option value="solved">Solved</option>
            </Select>

            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-44"
            >
              <option value="">All departments</option>
              {Array.from(
                new Map(
                  supportLogs.map((log) => [log.department_id, log.department])
                ).values()
              ).map((department) =>
                department ? (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ) : null
              )}
            </Select>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setDepartmentFilter("");
              }}
            >
              Clear filters
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {logsError && (
            <p className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {logsError}
            </p>
          )}

          {logsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Initiated By</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Worked By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      No support logs found. Try adjusting the filters, or create a new log.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium tabular-nums">
                        {log.ticket_number}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {log.issue_date.split("T")[0]}
                      </TableCell>
                      <TableCell>{log.initiated_by}</TableCell>
                      <TableCell>{log.department?.name ?? "-"}</TableCell>
                      <TableCell>{log.item_type?.name ?? "-"}</TableCell>
                      <TableCell>
                        {log.issue_types?.map((issue) => issue.name).join(", ") || "-"}
                      </TableCell>
                      <TableCell className="max-w-56 truncate">
                        {log.issue_details || "-"}
                      </TableCell>
                      <TableCell>
                        {canUpdateLogs(user) ? (
                          <Select
                            value={log.status}
                            onChange={(e) =>
                              handleStatusChange(log.id, e.target.value as SupportLogStatus)
                            }
                            className={cn(
                              "h-8 min-w-40 rounded-full text-xs font-medium",
                              STATUS_SELECT_CLASSES[log.status]
                            )}
                          >
                            {(Object.keys(STATUS_LABELS) as SupportLogStatus[]).map((s) => (
                              <option key={s} value={s}>
                                {STATUS_LABELS[s]}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                              STATUS_SELECT_CLASSES[log.status]
                            )}
                          >
                            {STATUS_LABELS[log.status]}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{log.assigned_resource?.name ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        {canDeleteLogs(user) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setLogToDelete(log)}
                            aria-label={`Delete ${log.ticket_number}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {!logsLoading && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {filteredLogs.length} of {visibleLogs.length} support logs
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New support log</DialogTitle>
            <DialogDescription>
              Fill in the details of the reported issue.
            </DialogDescription>
          </DialogHeader>
          <SupportLogForm
            onLogCreated={handleLogCreated}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={logToDelete !== null} onOpenChange={(open) => !open && setLogToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete support log</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {logToDelete?.ticket_number}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogToDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
