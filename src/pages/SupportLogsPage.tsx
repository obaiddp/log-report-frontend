import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Trash2, Eye } from "lucide-react";

import {
  ApiError,
  deleteSupportLog,
  getSupportLogs,
  getSupportLog,
  updateSupportLogStatus,
  type SupportLog,
  type SupportLogStatus,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { useAuth } from "@/context/AuthContext";

// Put this helper outside the component (or in your utils file)
const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const [y, m, d] = value.split("T")[0].split("-");
  return `${d}/${m}/${y}`; // 2026-11-05 -> 05/11/2026
};

const STATUS_LABELS: Record<SupportLogStatus, string> = {
  indoor_repairing: "Indoor Repairing",
  outdoor_repairing: "Outdoor Repairing",
  resolved: "Resolved",
  in_progress: "In Progress",
  closed: "Closed"
};

const STATUS_SELECT_CLASSES: Record<SupportLogStatus, string> = {
  indoor_repairing: "bg-blue-100 text-blue-800 border-transparent",
  outdoor_repairing: "bg-orange-100 text-orange-800 border-transparent",
  resolved: "bg-green-100 text-green-800 border-transparent",
  in_progress: "bg-amber-100 text-amber-800 border-transparent",
  closed: "bg-slate-200 text-slate-700 border-transparent",
};

function formatStatus(status: string): string {
  switch (status) {
    case "indoor_repairing":
      return "Indoor Repairing";
    case "outdoor_repairing":
      return "Outdoor Repairing";
    case "resolved":
      return "Resolved";
    case "in_progress":
      return "In Progress";
    case "closed":
      return "Closed";
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

  const [viewLog, setViewLog] = useState<SupportLog | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");

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

  async function handleViewLog(id: number) {
    try {
      setViewLoading(true);
      setViewError("");
      setViewLog(null);

      const response = await getSupportLog(id);

      setViewLog(response.data);
    } catch (err) {
      setViewError(
        err instanceof ApiError
          ? err.message
          : "Failed to load support log details."
      );
    } finally {
      setViewLoading(false);
    }
  }

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
  // const visibleLogs = useMemo(() => {
  //   if ( !user) {
  //     return supportLogs; 
  //   }

  //   if (user.role?.name === "super_admin") {
  //     return supportLogs;
  //   }

  //   return supportLogs.filter(
  //     (log) => log.created_by === user.id || log.assigned_to === user.id
  //   );
  // }, [supportLogs, user]);

  const visibleLogs = useMemo(() => {
    if (!user) {
      return supportLogs;
    }

    if (user.role?.name === "super_admin") {
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
    <div id="support-logs-page" className="space-y-4">
      <div id="support-logs-header" className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Support Logs</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button id="btn-export-csv" variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" /> Export CSV
          </Button>

          <Button id="btn-new-log" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> New Log
          </Button>

        </div>
      </div>

      {createdTicket && (
        <p className="rounded-md bg-status-solved-bg px-3 py-2 text-sm text-status-solved-text">
          Support log created successfully. Ticket: {createdTicket}
        </p>
      )}

      <Card>
        <CardHeader className="space-y-3">

          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="filter-search"
              type="text"
              placeholder="Search ticket, initiator, issue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64"
            />

            <Select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-44"
            >
              <option value="">All statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="indoor_repairing">Indoor Repairing</option>
              <option value="outdoor_repairing">Outdoor Repairing</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </Select>

            <Select
              id="filter-department"
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
              id="btn-clear-filters"
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
            <Table id="support-logs-table">
              <caption className="sr-only">Support logs</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Initiated By</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Issue Type</TableHead>
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
                    <TableRow key={log.id} id={`log-row-${log.id}`}>
                      <TableCell className="tabular-nums">
                        {formatDate(log.issue_date.split("T")[0])}
                      </TableCell>
                      <TableCell>{log.initiated_by}</TableCell>
                      <TableCell>{log.department?.name ?? "-"}</TableCell>
                      <TableCell>{log.item_type?.name ?? "-"}</TableCell>
                      <TableCell>
                        {log.issue_types?.map((issue) => issue.name).join(", ") || "-"}
                      </TableCell>
                      <TableCell>

                        <Select
                          id={`status-select-${log.id}`}
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

                      </TableCell>
                      <TableCell>{log.assigned_resource?.name ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            id={`btn-view-${log.id}`}
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-primary"
                            onClick={() => handleViewLog(log.id)}
                            aria-label={`View ${log.ticket_number}`}
                          >
                            <Eye className="size-4" />
                          </Button>

                          <Button
                            id={`btn-delete-${log.id}`}
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => setLogToDelete(log)}
                            aria-label={`Delete ${log.ticket_number}`}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
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
         


  <DialogContent id="dialog-create-log" className="max-w-2xl">
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

      {/* <Dialog open={createOpen} onOpenChange={setCreateOpen}>
  <DialogContent id="dialog-create-log" className="max-w-3xl gap-0 overflow-hidden p-0">
    <SupportLogForm
      onLogCreated={handleLogCreated}
      onCancel={() => setCreateOpen(false)}
    />
  </DialogContent>
</Dialog> */}



      <Dialog
        open={viewLoading || viewLog !== null || viewError !== ""}
        onOpenChange={(open) => {
          if (!open) {
            setViewLog(null);
            setViewError("");
          }
        }}
      >
        <DialogContent id="dialog-view-log" className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {/* Required by Radix for accessibility, hidden visually */}
          <DialogTitle className="sr-only">Log details</DialogTitle>

          {viewLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : viewError ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {viewError}
            </p>
          ) : viewLog ? (
            <div className="space-y-5">
              {/* Header: ticket, title, date */}
              <div className="space-y-1 border-b pb-4 pr-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs tracking-wide text-muted-foreground/70">
                    {viewLog.ticket_number}
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium",
                      STATUS_SELECT_CLASSES[viewLog.status]
                    )}
                  >
                    {formatStatus(viewLog.status)}
                  </span>
                </div>
                <h2 className="text-lg font-semibold leading-tight">
                  {viewLog.title /* <- replace with your "Outdoor Repairing" field */}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {formatDate(viewLog.issue_date)}
                </p>
              </div>

              {/* Meta rows */}
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <tbody className="divide-y">
                    <tr>
                      <th className="w-1/3 bg-muted/40 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        Initiated By
                      </th>
                      <td className="px-4 py-2.5 font-medium">
                        <p>
                          <span className="font-medium">{viewLog.initiated_by}</span>{" "}
                          <span className="text-muted-foreground">
                            ({viewLog.department?.name ?? "-"})
                          </span>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <th className="w-1/3 bg-muted/40 px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                        Item
                      </th>
                      <td className="px-4 py-2.5 font-medium">
                        <p>
                          <span className="font-medium">{viewLog.item_type?.name ?? "-"}</span>{" "}
                          <span className="text-muted-foreground">
                            (
                            {viewLog.issue_types?.length
                              ? viewLog.issue_types.map((i) => i.name).join(", ")
                              : "-"}
                            )
                          </span>
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>


              {/* Description */}
              <div className="space-y-1.5">
                <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm leading-relaxed">
                  {viewLog.issue_details || "No description provided."}
                </p>
              </div>

              {/* Table-style details */}
              {/* Footer: worked by / created by */}
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
                <p>
                  Worked by:{" "}
                  <span className="font-medium text-foreground">
                    {viewLog.assigned_resource?.name ?? "Not assigned"}
                  </span>
                </p>
                <p>
                  Created by:{" "}
                  <span className="font-medium text-foreground">
                    {viewLog.creator?.name ?? "-"}
                  </span>
                </p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={logToDelete !== null} onOpenChange={(open) => !open && setLogToDelete(null)}>
        <DialogContent id="dialog-delete-log">
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