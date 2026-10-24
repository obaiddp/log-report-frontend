import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

import {
  ApiError,
  deleteAssetInspection,
  getAssetInspections,
  getDepartments,
  type AssetApprovalStatus,
  type AssetInspection,
  type Department,
} from "@/lib/api";
import {
  adminUserName,
  approvalBadgeVariant,
  canEditInspection,
  canSignInspection,
  formatApprovalStatus,
  formatDateTime,
  formatInspectionStatus,
  inspectionSearchText,
  orDash,
  preparedByName,
  type AssetInspectionUser,
} from "@/lib/asset-inspections";
import { useAuth } from "@/context/AuthContext";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function csvCell(value: string | number | null | undefined): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

const APPROVAL_FILTERS: AssetApprovalStatus[] = [
  "pending_admin",
  "completed",
  "returned",
];

/** Cheap fingerprint of the list, used to skip needless re-renders. */
function inspectionSignature(items: AssetInspection[]): string {
  return JSON.stringify(
    items.map((inspection) => [
      inspection.id,
      inspection.updated_at,
      inspection.approval_status,
    ])
  );
}

export default function AssetInspectionsPage() {
  const { user } = useAuth();
  const authUser: AssetInspectionUser | null = user;

  const [inspections, setInspections] = useState<AssetInspection[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AssetInspection | null>(null);
  const [deleting, setDeleting] = useState(false);

  const inspectionsSignatureRef = useRef("");
  const departmentsSignatureRef = useRef("");

  const loadInspections = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;

      try {
        // A background refresh keeps the current rows on screen, so the table
        // never flashes the skeleton while another user is working.
        if (!silent) {
          setLoading(true);
          setError("");
        }

        const [inspectionsResponse, departmentsResponse] = await Promise.all([
          getAssetInspections(),
          getDepartments(),
        ]);

        const inspectionsSignature = inspectionSignature(inspectionsResponse.data);
        if (inspectionsSignature !== inspectionsSignatureRef.current) {
          inspectionsSignatureRef.current = inspectionsSignature;
          setInspections(inspectionsResponse.data);
        }

        const departmentsSignature = JSON.stringify(departmentsResponse.data);
        if (departmentsSignature !== departmentsSignatureRef.current) {
          departmentsSignatureRef.current = departmentsSignature;
          setDepartments(departmentsResponse.data);
        }
      } catch (loadError) {
        if (!silent) {
          setError(errorMessage(loadError, "Failed to load asset inspections."));
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void loadInspections();
  }, [loadInspections]);

  // Picks up changes made by the ICT user and by the admin approver.
  useAutoRefresh(() => loadInspections({ silent: true }));

  const statusOptions = useMemo(() => {
    const unique = new Set(
      inspections
        .map((inspection) => inspection.status)
        .filter((status): status is string => Boolean(status))
    );

    return Array.from(unique).sort();
  }, [inspections]);

  const filteredInspections = useMemo(() => {
    const term = search.trim().toLowerCase();

    return inspections.filter((inspection) => {
      const matchesSearch = !term || inspectionSearchText(inspection).includes(term);
      const matchesDepartment =
        !departmentFilter || String(inspection.department_id) === departmentFilter;
      const matchesStatus = !statusFilter || inspection.status === statusFilter;
      const matchesApproval =
        !approvalFilter || inspection.approval_status === approvalFilter;

      return matchesSearch && matchesDepartment && matchesStatus && matchesApproval;
    });
  }, [approvalFilter, departmentFilter, inspections, search, statusFilter]);

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);
      await deleteAssetInspection(deleteTarget.id);
      setInspections((current) =>
        current.filter((inspection) => inspection.id !== deleteTarget.id)
      );
      setDeleteTarget(null);
      // Pull the fresh list right away instead of waiting for the next tick.
      await loadInspections({ silent: true });
    } catch (deleteError) {
      setError(errorMessage(deleteError, "Failed to delete the asset inspection."));
    } finally {
      setDeleting(false);
    }
  }

  function handleExport() {
    if (filteredInspections.length === 0) {
      setError("There are no asset inspections to export with the current filters.");
      return;
    }

    const headers = [
      "Person",
      "Designation",
      "Email",
      "Cell",
      "Department",
      "Territory",
      "Item type",
      "Brand",
      "Model",
      "Serial number",
      "Item tag",
      "RAM",
      "Generation",
      "Hard drive",
      "Problem",
      "IT remarks",
      "Admin remarks",
      "Prepared by",
      "Status",
      "Approval status",
      "Admin",
      "Admin signed at",
      "Return reason",
      "Last updated",
    ];

    const rows = filteredInspections.map((inspection) => [
      inspection.username,
      inspection.designation,
      inspection.email,
      inspection.cell,
      inspection.department?.name,
      inspection.territory,
      inspection.item_type?.name,
      inspection.brand,
      inspection.model,
      inspection.serial_number,
      inspection.item_tag,
      inspection.ram,
      inspection.generation,
      inspection.hard_drive,
      inspection.item_problem,
      inspection.it_remarks,
      inspection.admin_remarks,
      preparedByName(inspection),
      inspection.status,
      inspection.approval_status,
      adminUserName(inspection),
      inspection.admin_signed_at,
      inspection.return_reason,
      inspection.updated_at,
    ]);

    const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "asset-inspections.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const hasFilters = Boolean(search || departmentFilter || statusFilter || approvalFilter);

  return (
    <div id="asset-inspections-page" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Asset inspections</h2>





        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" /> Export CSV
          </Button>
          <Button variant="outline" size="icon" onClick={() => void loadInspections()} aria-label="Refresh inspections">
            <RefreshCw className="size-4" />
          </Button>
          <Button asChild size="sm">
            <Link to="/asset-inspections/new">
              <Plus className="size-4" /> New inspection
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Inspection records</CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="asset-inspection-search"
              type="search"
              placeholder="Search person, item, tag, problem..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full sm:w-72"
              aria-label="Search asset inspections"
            />

            <Select
              id="asset-inspection-department-filter"
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="w-48"
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>

            <Select
              id="asset-inspection-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-44"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {formatInspectionStatus(status)}
                </option>
              ))}
            </Select>

            <Select
              id="asset-inspection-approval-filter"
              value={approvalFilter}
              onChange={(event) => setApprovalFilter(event.target.value)}
              className="w-44"
              aria-label="Filter by approval status"
            >
              <option value="">All approvals</option>
              {APPROVAL_FILTERS.map((approval) => (
                <option key={approval} value={approval}>
                  {formatApprovalStatus(approval)}
                </option>
              ))}
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setDepartmentFilter("");
                  setStatusFilter("");
                  setApprovalFilter("");
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table id="asset-inspections-table">
              <caption className="sr-only">Asset inspections</caption>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Tag / serial</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Prepared by</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-muted-foreground">
                      No asset inspections found. Adjust the filters or create a new inspection.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInspections.map((inspection) => (
                    <TableRow key={inspection.id} id={`asset-inspection-row-${inspection.id}`}>
                      <TableCell>
                        <div className="font-medium text-foreground">{inspection.username}</div>
                        <div className="text-xs text-muted-foreground">
                          {orDash(inspection.designation)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {inspection.department?.name ?? "-"}
                        {inspection.territory && (
                          <div className="text-xs text-muted-foreground">{inspection.territory}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{inspection.item_type?.name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {inspection.brand} · {inspection.model}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="tabular-nums">{orDash(inspection.item_tag)}</div>
                        <div className="text-xs text-muted-foreground">
                          {orDash(inspection.serial_number)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-64">
                        <span className="line-clamp-2">
                          {orDash(inspection.item_problem)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {inspection.status ? (
                          <Badge variant="outline">{formatInspectionStatus(inspection.status)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={approvalBadgeVariant(inspection.approval_status)}>
                          {formatApprovalStatus(inspection.approval_status)}
                        </Badge>
                        {canSignInspection(inspection, authUser) && (
                          <div className="mt-1 text-xs font-medium text-primary-hover">
                            Needs your signature
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{preparedByName(inspection)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(inspection.updated_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">

                          <Button asChild variant="ghost" size="icon" aria-label={`View inspection for ${inspection.username}`}>
                            <Link to={`/asset-inspections/${inspection.id}`}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>

                          {canEditInspection(inspection, authUser) && (
                            <Button asChild variant="ghost" size="icon" aria-label={`Edit inspection for ${inspection.username}`}>
                              <Link to={`/asset-inspections/${inspection.id}/edit`}>
                                <Pencil className="size-4" />
                              </Link>
                            </Button>
                          )}

                          {canEditInspection(inspection, authUser) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteTarget(inspection)}
                              aria-label={`Delete inspection for ${inspection.username}`}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}

                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {!loading && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing {filteredInspections.length} of {inspections.length} asset inspections
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent id="dialog-delete-asset-inspection">
          <DialogHeader>
            <DialogTitle>Delete asset inspection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the inspection record for{" "}
              <span className="font-medium text-foreground">{deleteTarget?.username}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}