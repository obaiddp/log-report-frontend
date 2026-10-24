import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Loader2,
  Pencil,
  PenLine,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react";

import {
  ApiError,
  deleteAssetInspection,
  getAssetInspection,
  returnAssetInspection,
  signAssetInspection,
  type AssetApprovalStatus,
  type AssetInspection,
} from "@/lib/api";
import {
  adminUserName,
  approvalBadgeVariant,
  canEditInspection,
  canSignInspection,
  formatApprovalStatus,
  formatDateTime,
  formatInspectionStatus,
  orDash,
  preparedByName,
  type AssetInspectionUser,
} from "@/lib/asset-inspections";
import { useAuth } from "@/context/AuthContext";
import { useAutoRefresh } from "@/hooks/use-auto-refresh";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
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
import { Skeleton } from "@/components/ui/skeleton";

const MAX_RETURN_REASON = 2000;

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

function Notes({ value }: { value: string | null }) {
  if (!value) {
    return <span className="text-muted-foreground">No remarks recorded.</span>;
  }

  return <span className="whitespace-pre-wrap text-sm text-foreground">{value}</span>;
}

function ErrorText({ message }: { message: string }) {
  return (
    <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export default function AssetInspectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const authUser: AssetInspectionUser | null = user;
  const { toast } = useToast();

  const [inspection, setInspection] = useState<AssetInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const [adminRemarks, setAdminRemarks] = useState("");
  const [showSign, setShowSign] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returnReasonError, setReturnReasonError] = useState("");
  const [approving, setApproving] = useState(false);
  const [approvalError, setApprovalError] = useState("");

  // Last known approval status, used to detect changes made by the other side.
  const approvalStatusRef = useRef<AssetApprovalStatus | null>(null);
  const recordSignatureRef = useRef("");

  const loadInspection = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const { silent = false } = options;
      if (!id) return;

      try {
        // A background refresh keeps the record on screen, the page never
        // falls back to the skeleton while the other side is working.
        if (!silent) {
          setLoading(true);
          setError("");
        }

        const response = await getAssetInspection(Number(id));
        const data = response.data;

        const previousStatus = approvalStatusRef.current;
        approvalStatusRef.current = data.approval_status;

        if (previousStatus !== null && previousStatus !== data.approval_status) {
          toast({ title: "This inspection was updated" });
        }

        // Only re-render when the record really changed.
        const signature = JSON.stringify([
          data.id,
          data.updated_at,
          data.approval_status,
        ]);
        if (signature !== recordSignatureRef.current) {
          recordSignatureRef.current = signature;
          setInspection(data);
        }
      } catch (loadError) {
        if (
          loadError instanceof ApiError &&
          (loadError.status === 403 || loadError.status === 404)
        ) {
          navigate("/asset-inspections", { replace: true });
          return;
        }

        if (!silent) {
          setError(errorMessage(loadError, "Failed to load the asset inspection."));
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [id, navigate, toast]
  );

  useEffect(() => {
    void loadInspection();
  }, [loadInspection]);

  // A different record starts over, the first load never announces a change.
  useEffect(() => {
    approvalStatusRef.current = null;
  }, [id]);

  // Picks up changes made by the other side, but never while a dialog is
  // open or an action is running, so nothing typed is lost.
  useAutoRefresh(() => loadInspection({ silent: true }), {
    enabled: !showSign && !showReturn && !showDelete && !approving && !deleting,
  });

  async function handleExportPdf() {
    if (!inspection) return;

    try {
      setExporting(true);
      setExportError("");

      // Loaded on demand so @react-pdf/renderer stays out of the main bundle.
      const { downloadAssetInspectionPdf } = await import(
        "@/lib/pdf/asset-inspection-pdf"
      );
      await downloadAssetInspectionPdf(inspection);
    } catch (pdfError) {
      setExportError(
        errorMessage(pdfError, "Could not generate the PDF. Please try again.")
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (!inspection) return;

    try {
      setDeleting(true);
      await deleteAssetInspection(inspection.id);
      navigate("/asset-inspections", { replace: true });
    } catch (deleteError) {
      setError(errorMessage(deleteError, "Failed to delete the asset inspection."));
      setShowDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  async function handleSign() {
    if (!inspection) return;

    try {
      setApproving(true);
      setApprovalError("");

      const response = await signAssetInspection(inspection.id, {
        admin_remarks: adminRemarks.trim() || null,
      });

      // Our own action, so the status change is not announced as a toast.
      approvalStatusRef.current = response.data.approval_status;
      setInspection(response.data);
      setShowSign(false);
      setAdminRemarks("");

      // Pull the fresh record right away instead of waiting for the next tick.
      await loadInspection({ silent: true });
    } catch (signError) {
      setApprovalError(errorMessage(signError, "Failed to sign the asset inspection."));
    } finally {
      setApproving(false);
    }
  }

  async function handleReturn() {
    if (!inspection) return;

    const reason = returnReason.trim();

    if (!reason) {
      setReturnReasonError("Enter a reason so the IT team knows what to correct.");
      return;
    }

    if (reason.length > MAX_RETURN_REASON) {
      setReturnReasonError(`Keep the reason under ${MAX_RETURN_REASON} characters.`);
      return;
    }

    try {
      setApproving(true);
      setApprovalError("");

      const response = await returnAssetInspection(inspection.id, {
        return_reason: reason,
        admin_remarks: adminRemarks.trim() || null,
      });

      // Our own action, so the status change is not announced as a toast.
      approvalStatusRef.current = response.data.approval_status;
      setInspection(response.data);
      setShowReturn(false);
      setReturnReason("");
      setReturnReasonError("");
      setAdminRemarks("");

      // Pull the fresh record right away instead of waiting for the next tick.
      await loadInspection({ silent: true });
    } catch (returnError) {
      setApprovalError(
        errorMessage(returnError, "Failed to return the asset inspection.")
      );
    } finally {
      setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error || "This asset inspection could not be found."}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadInspection()}>
            <RefreshCw className="size-4" /> Try again
          </Button>
          <Button asChild variant="ghost">
            <Link to="/asset-inspections">Back to inspections</Link>
          </Button>
        </div>
      </div>
    );
  }

  const canEdit = canEditInspection(inspection, authUser);
  const canApprove = canSignInspection(inspection, authUser);
  const isReturned = inspection.approval_status === "returned";

  return (
    <div id="asset-inspection-detail" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/asset-inspections">
              <ArrowLeft className="size-4" /> Back to inspections
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {inspection.username} · {inspection.item_type?.name ?? "Item inspection"}
            </h2>
            {inspection.status && (
              <Badge variant="outline">{formatInspectionStatus(inspection.status)}</Badge>
            )}
            <Badge variant={approvalBadgeVariant(inspection.approval_status)}>
              {formatApprovalStatus(inspection.approval_status)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {inspection.brand} {inspection.model}
            {inspection.item_tag ? ` · Tag ${inspection.item_tag}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExportPdf()}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Download className="size-4" />
            )}
            {exporting ? "Preparing PDF..." : "Export as PDF"}
          </Button>
          {canEdit && (
            <Button asChild variant="outline" size="sm">
              <Link to={`/asset-inspections/${inspection.id}/edit`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {exportError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {exportError}
        </p>
      )}

      {isReturned && (
        <div className="rounded-md bg-status-indoor-bg px-3 py-2 text-sm text-status-indoor-text">
          <p className="font-medium">Returned to IT by the admin.</p>
          <p className="mt-1 whitespace-pre-wrap">
            {inspection.return_reason || "No reason was recorded."}
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Person</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <DetailField label="Name" value={inspection.username} />
            <DetailField label="Designation" value={orDash(inspection.designation)} />
            <DetailField label="Email" value={orDash(inspection.email)} />
            <DetailField label="Cell" value={orDash(inspection.cell)} />
            <DetailField
              label="Department"
              value={orDash(inspection.department?.name)}
            />
            <DetailField label="Territory" value={orDash(inspection.territory)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Item details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <DetailField label="Item type" value={inspection.item_type?.name ?? "—"} />
            <DetailField label="Status" value={formatInspectionStatus(inspection.status)} />
            <DetailField label="Brand" value={inspection.brand} />
            <DetailField label="Model" value={inspection.model} />
            <DetailField label="Serial number" value={orDash(inspection.serial_number)} />
            <DetailField label="Item tag" value={orDash(inspection.item_tag)} />
            <DetailField label="RAM" value={orDash(inspection.ram)} />
            <DetailField label="Generation" value={orDash(inspection.generation)} />
            <DetailField label="Hard drive" value={orDash(inspection.hard_drive)} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Inspection findings</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <DetailField label="Item problem" value={<Notes value={inspection.item_problem} />} />
            <DetailField label="IT remarks" value={<Notes value={inspection.it_remarks} />} />
            <DetailField
              label="Admin remarks"
              value={<Notes value={inspection.admin_remarks} />}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Preparation and sign-off</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <DetailField
              label="Prepared by"
              value={
                <>
                  <div className="font-medium text-foreground">
                    {preparedByName(inspection)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(inspection.prepared_signed_at)}
                  </div>
                </>
              }
            />
            <DetailField
              label="User acknowledged"
              value={
                inspection.user_digital_signature
                  ? formatDateTime(inspection.user_signed_at)
                  : "Not acknowledged"
              }
            />
            <DetailField
              label="Admin"
              value={
                <>
                  <div className="font-medium text-foreground">
                    {adminUserName(inspection)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {inspection.admin_signed_at
                      ? formatDateTime(inspection.admin_signed_at)
                      : "Awaiting signature"}
                  </div>
                </>
              }
            />
            <DetailField label="Last updated" value={formatDateTime(inspection.updated_at)} />
          </CardContent>
        </Card>

        {canApprove && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Admin approval</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="asset-inspection-admin-remarks"
                  className="text-sm font-medium text-foreground"
                >
                  Admin remarks
                </label>
                <Textarea
                  id="asset-inspection-admin-remarks"
                  rows={3}
                  value={adminRemarks}
                  onChange={(event) => setAdminRemarks(event.target.value)}
                  disabled={approving}
                  placeholder="Optional remarks saved with your signature..."
                />
              </div>

              {approvalError && <ErrorText message={approvalError} />}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReturnReasonError("");
                    setShowReturn(true);
                  }}
                  disabled={approving}
                >
                  <Undo2 className="size-4" /> Return to IT
                </Button>
                <Button onClick={() => setShowSign(true)} disabled={approving}>
                  <PenLine className="size-4" /> Sign as admin
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent id="dialog-delete-asset-inspection">
          <DialogHeader>
            <DialogTitle>Delete asset inspection</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the inspection record for{" "}
              <span className="font-medium text-foreground">{inspection.username}</span>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showSign}
        onOpenChange={(open) => {
          if (!approving) setShowSign(open);
        }}
      >
        <DialogContent id="dialog-sign-asset-inspection">
          <DialogHeader>
            <DialogTitle>Sign asset inspection</DialogTitle>
            <DialogDescription>
              Signing as admin completes this inspection for{" "}
              <span className="font-medium text-foreground">{inspection.username}</span>. The
              IT team can no longer edit it.
            </DialogDescription>
          </DialogHeader>
          {approvalError && <ErrorText message={approvalError} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSign(false)} disabled={approving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSign()} disabled={approving}>
              {approving ? "Signing..." : "Sign as admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showReturn}
        onOpenChange={(open) => {
          if (!approving) setShowReturn(open);
        }}
      >
        <DialogContent id="dialog-return-asset-inspection">
          <DialogHeader>
            <DialogTitle>Return to IT</DialogTitle>
            <DialogDescription>
              The inspection goes back to{" "}
              <span className="font-medium text-foreground">
                {preparedByName(inspection)}
              </span>{" "}
              with the reason below.
            </DialogDescription>
          </DialogHeader>

          {approvalError && <ErrorText message={approvalError} />}

          <div className="space-y-1.5">
            <label
              htmlFor="asset-inspection-return-reason"
              className="text-sm font-medium text-foreground"
            >
              Return reason <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="asset-inspection-return-reason"
              rows={4}
              value={returnReason}
              onChange={(event) => {
                setReturnReason(event.target.value);
                setReturnReasonError("");
              }}
              disabled={approving}
              placeholder="Explain what has to be corrected before approval..."
            />
            {returnReasonError && (
              <p className="text-xs text-destructive">{returnReasonError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReturn(false)} disabled={approving}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleReturn()}
              disabled={approving}
            >
              {approving ? "Returning..." : "Return to IT"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
