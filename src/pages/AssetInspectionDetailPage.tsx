import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";

import {
  ApiError,
  deleteAssetInspection,
  getAssetInspection,
  type AssetInspection,
} from "@/lib/api";
import {
  formatDateTime,
  formatInspectionStatus,
  orDash,
  preparedByName,
} from "@/lib/asset-inspections";
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

export default function AssetInspectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [inspection, setInspection] = useState<AssetInspection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const loadInspection = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError("");

      const response = await getAssetInspection(Number(id));
      setInspection(response.data);
    } catch (loadError) {
      setError(errorMessage(loadError, "Failed to load the asset inspection."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadInspection();
  }, [loadInspection]);

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
          <Button asChild variant="outline" size="sm">
            <Link to={`/asset-inspections/${inspection.id}/edit`}>
              <Pencil className="size-4" /> Edit
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDelete(true)}>
            <Trash2 className="size-4" /> Delete
          </Button>
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
            <DetailField label="Prepared by" value={preparedByName(inspection)} />
            <DetailField label="User signature" value={orDash(inspection.user_signature)} />
            <DetailField label="Admin signature" value={orDash(inspection.admin_signature)} />
            <DetailField label="Last updated" value={formatDateTime(inspection.updated_at)} />
          </CardContent>
        </Card>
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
    </div>
  );
}