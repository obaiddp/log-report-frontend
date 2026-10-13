import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";

import {
  ApiError,
  createAssetInspection,
  getAssetInspection,
  getDepartments,
  getItems,
  getUsers,
  updateAssetInspection,
  type AssetInspection,
  type AssetInspectionInput,
  type Department,
  type Item,
  type User,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type FormState = {
  username: string;
  designation: string;
  email: string;
  cell: string;
  departmentId: string;
  territory: string;
  status: string;
  itemTypeId: string;
  brand: string;
  model: string;
  serialNumber: string;
  itemTag: string;
  ram: string;
  generation: string;
  hardDrive: string;
  itemProblem: string;
  itRemarks: string;
  adminRemarks: string;
  preparedBy: string;
  userSignature: string;
  adminSignature: string;
};

const EMPTY_FORM: FormState = {
  username: "",
  designation: "",
  email: "",
  cell: "",
  departmentId: "",
  territory: "",
  status: "",
  itemTypeId: "",
  brand: "",
  model: "",
  serialNumber: "",
  itemTag: "",
  ram: "",
  generation: "",
  hardDrive: "",
  itemProblem: "",
  itRemarks: "",
  adminRemarks: "",
  preparedBy: "",
  userSignature: "",
  adminSignature: "",
};

const SERVER_FIELD_KEYS: Record<string, keyof FormState> = {
  department_id: "departmentId",
  item_type_id: "itemTypeId",
  prepared_by: "preparedBy",
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

function fieldErrorsFrom(error: ApiError): Record<string, string> {
  if (!error.errors) return {};

  return Object.fromEntries(
    Object.entries(error.errors).map(([field, messages]) => {
      const key = SERVER_FIELD_KEYS[field] ?? field;
      return [key, messages[0] ?? "Invalid value."];
    })
  );
}

function toFormState(inspection: AssetInspection): FormState {
  return {
    username: inspection.username ?? "",
    designation: inspection.designation ?? "",
    email: inspection.email ?? "",
    cell: inspection.cell ?? "",
    departmentId: String(inspection.department_id ?? ""),
    territory: inspection.territory ?? "",
    status: inspection.status ?? "",
    itemTypeId: String(inspection.item_type_id ?? ""),
    brand: inspection.brand ?? "",
    model: inspection.model ?? "",
    serialNumber: inspection.serial_number ?? "",
    itemTag: inspection.item_tag ?? "",
    ram: inspection.ram ?? "",
    generation: inspection.generation ?? "",
    hardDrive: inspection.hard_drive ?? "",
    itemProblem: inspection.item_problem ?? "",
    itRemarks: inspection.it_remarks ?? "",
    adminRemarks: inspection.admin_remarks ?? "",
    preparedBy:
      typeof inspection.prepared_by === "number"
        ? String(inspection.prepared_by)
        : String(inspection.prepared_by?.id ?? ""),
    userSignature: inspection.user_signature ?? "",
    adminSignature: inspection.admin_signature ?? "",
  };
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

function Field({
  id,
  label,
  error,
  required = false,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function AssetInspectionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const isEditing = Boolean(id);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadForm = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setFieldErrors({});

      const [departmentsResponse, itemsResponse, usersResponse] = await Promise.all([
        getDepartments(),
        getItems(),
        getUsers(),
      ]);

      setDepartments(departmentsResponse.data);
      setItems(itemsResponse.data);
      setUsers(usersResponse.data);

      if (id) {
        const inspectionResponse = await getAssetInspection(Number(id));
        setForm(toFormState(inspectionResponse.data));
      } else {
        setForm((current) => ({
          ...current,
          username: current.username || authUser?.name || "",
          email: current.email || authUser?.email || "",
          designation: current.designation || authUser?.designation || "",
          preparedBy: current.preparedBy || String(authUser?.id ?? ""),
        }));
      }
    } catch (loadError) {
      setError(errorMessage(loadError, "Failed to load the inspection form."));
    } finally {
      setLoading(false);
    }
  }, [authUser, id]);

  useEffect(() => {
    void loadForm();
  }, [loadForm]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  const selectedItem = items.find((item) => String(item.id) === form.itemTypeId);
  const acceptsSpecifications = selectedItem?.has_specification === true;

  function handleItemTypeChange(value: string) {
    const nextItem = items.find((item) => String(item.id) === value);
    const keepsSpecifications = nextItem?.has_specification === true;

    setForm((current) => ({
      ...current,
      itemTypeId: value,
      // Switching to an item type without specifications must not carry over
      // hardware values typed for a previous item.
      ram: keepsSpecifications ? current.ram : "",
      generation: keepsSpecifications ? current.generation : "",
      hardDrive: keepsSpecifications ? current.hardDrive : "",
    }));

    setFieldErrors((current) => {
      if (!current.itemTypeId) return current;
      const next = { ...current };
      delete next.itemTypeId;
      return next;
    });
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};

    if (!form.username.trim()) errors.username = "Enter the name of the person bringing the item.";
    if (!form.departmentId) errors.departmentId = "Select a department.";
    if (!form.itemTypeId) errors.itemTypeId = "Select an item type.";
    if (!form.brand.trim()) errors.brand = "Enter the item brand.";
    if (!form.model.trim()) errors.model = "Enter the item model.";
    if (!form.preparedBy) errors.preparedBy = "Select who prepared this inspection.";
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = "Enter a valid email address.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;

    const optional = (value: string) => value.trim() || null;

    const payload: AssetInspectionInput = {
      username: form.username.trim(),
      designation: optional(form.designation),
      email: optional(form.email),
      cell: optional(form.cell),
      department_id: Number(form.departmentId),
      territory: optional(form.territory),
      status: optional(form.status),
      item_type_id: Number(form.itemTypeId),
      brand: form.brand.trim(),
      model: form.model.trim(),
      serial_number: optional(form.serialNumber),
      item_tag: optional(form.itemTag),
      ram: acceptsSpecifications ? optional(form.ram) : null,
      generation: acceptsSpecifications ? optional(form.generation) : null,
      hard_drive: acceptsSpecifications ? optional(form.hardDrive) : null,
      item_problem: optional(form.itemProblem),
      it_remarks: optional(form.itRemarks),
      admin_remarks: optional(form.adminRemarks),
      prepared_by: Number(form.preparedBy),
      user_signature: optional(form.userSignature),
      admin_signature: optional(form.adminSignature),
    };

    try {
      setSubmitting(true);
      setError("");
      setFieldErrors({});

      const response = isEditing
        ? await updateAssetInspection(Number(id), payload)
        : await createAssetInspection(payload);

      navigate(`/asset-inspections/${response.data.id}`, { replace: true });
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
        setFieldErrors(fieldErrorsFrom(submitError));
      } else {
        setError("Something went wrong while saving the inspection.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form id="asset-inspection-form" onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Button asChild variant="ghost" size="sm" className="-ml-3">
            <Link to="/asset-inspections">
              <ArrowLeft className="size-4" /> Back to inspections
            </Link>
          </Button>
          <h2 className="text-lg font-semibold text-foreground">
            {isEditing ? "Edit asset inspection" : "New asset inspection"}
          </h2>

          {/* <p className="text-sm text-muted-foreground">
            {isEditing
              ? "Update the recorded person, equipment details and sign-off."
              : "Capture who brought the item, its condition and the inspection findings."}
          </p> */}

        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Person bringing the item</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field id="inspection-username" label="Full name" required error={fieldErrors.username}>
                <Input
                  id="inspection-username"
                  // value={form.username}
                  onChange={(event) => updateField("username", event.target.value)}
                  disabled={submitting}
                  autoComplete="name"
                />
              </Field>

              <Field id="inspection-designation" label="Designation" error={fieldErrors.designation}>
                <Input
                  id="inspection-designation"
                  // value={form.designation}
                  onChange={(event) => updateField("designation", event.target.value)}
                  disabled={submitting}
                />
              </Field>

              <Field id="inspection-email" label="Email" error={fieldErrors.email}>
                <Input
                  id="inspection-email"
                  type="email"
                  // value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  disabled={submitting}
                  autoComplete="email"
                />
              </Field>

              <Field id="inspection-cell" label="Cell" error={fieldErrors.cell}>
                <Input
                  id="inspection-cell"
                  type="tel"
                  value={form.cell}
                  onChange={(event) => updateField("cell", event.target.value)}
                  disabled={submitting}
                  autoComplete="tel"
                />
              </Field>

              <Field
                id="inspection-department"
                label="Department"
                required
                error={fieldErrors.departmentId}
              >
                <Select
                  id="inspection-department"
                  value={form.departmentId}
                  onChange={(event) => updateField("departmentId", event.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field id="inspection-territory" label="Territory / location" error={fieldErrors.territory}>
                <Input
                  id="inspection-territory"
                  value={form.territory}
                  onChange={(event) => updateField("territory", event.target.value)}
                  disabled={submitting}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Item details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field
                id="inspection-item-type"
                label="Item type"
                required
                error={fieldErrors.itemTypeId}
                hint={
                  selectedItem && !acceptsSpecifications
                    ? "This item type does not record hardware specifications."
                    : undefined
                }
              >
                <Select
                  id="inspection-item-type"
                  value={form.itemTypeId}
                  onChange={(event) => handleItemTypeChange(event.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select item type</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field id="inspection-status" label="Status" error={fieldErrors.status}>
                <Input
                  id="inspection-status"
                  value={form.status}
                  onChange={(event) => updateField("status", event.target.value)}
                  disabled={submitting}
                  placeholder="pending"
                />
              </Field>

              <Field id="inspection-brand" label="Brand" required error={fieldErrors.brand}>
                <Input
                  id="inspection-brand"
                  value={form.brand}
                  onChange={(event) => updateField("brand", event.target.value)}
                  disabled={submitting}
                />
              </Field>

              <Field id="inspection-model" label="Model" required error={fieldErrors.model}>
                <Input
                  id="inspection-model"
                  value={form.model}
                  onChange={(event) => updateField("model", event.target.value)}
                  disabled={submitting}
                />
              </Field>

              <Field id="inspection-serial" label="Serial number" error={fieldErrors.serial_number}>
                <Input
                  id="inspection-serial"
                  value={form.serialNumber}
                  onChange={(event) => updateField("serialNumber", event.target.value)}
                  disabled={submitting}
                />
              </Field>

              <Field id="inspection-item-tag" label="Item tag" error={fieldErrors.item_tag}>
                <Input
                  id="inspection-item-tag"
                  value={form.itemTag}
                  onChange={(event) => updateField("itemTag", event.target.value)}
                  disabled={submitting}
                />
              </Field>

              {acceptsSpecifications && (
                <>
                  <Field
                    id="inspection-ram"
                    label="RAM"
                    error={fieldErrors.ram}
                    className="sm:col-span-2 lg:col-span-3"
                  >
                    <Input
                      id="inspection-ram"
                      value={form.ram}
                      onChange={(event) => updateField("ram", event.target.value)}
                      disabled={submitting}
                      placeholder="e.g. 16 GB"
                    />
                  </Field>

                  <Field id="inspection-generation" label="Generation" error={fieldErrors.generation}>
                    <Input
                      id="inspection-generation"
                      value={form.generation}
                      onChange={(event) => updateField("generation", event.target.value)}
                      disabled={submitting}
                      placeholder="e.g. 13th Gen"
                    />
                  </Field>

                  <Field id="inspection-hard-drive" label="Hard drive" error={fieldErrors.hard_drive}>
                    <Input
                      id="inspection-hard-drive"
                      value={form.hardDrive}
                      onChange={(event) => updateField("hardDrive", event.target.value)}
                      disabled={submitting}
                      placeholder="e.g. 512 GB SSD"
                    />
                  </Field>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inspection findings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field id="inspection-problem" label="Item problem" error={fieldErrors.item_problem}>
                <Textarea
                  id="inspection-problem"
                  rows={3}
                  value={form.itemProblem}
                  onChange={(event) => updateField("itemProblem", event.target.value)}
                  disabled={submitting}
                  placeholder="Describe the problem reported with the item..."
                />
              </Field>

              <Field id="inspection-it-remarks" label="IT remarks" error={fieldErrors.it_remarks}>
                <Textarea
                  id="inspection-it-remarks"
                  rows={3}
                  value={form.itRemarks}
                  onChange={(event) => updateField("itRemarks", event.target.value)}
                  disabled={submitting}
                  placeholder="Findings and recommendations from the IT team..."
                />
              </Field>

              <Field id="inspection-admin-remarks" label="Admin remarks" error={fieldErrors.admin_remarks}>
                <Textarea
                  id="inspection-admin-remarks"
                  rows={3}
                  value={form.adminRemarks}
                  onChange={(event) => updateField("adminRemarks", event.target.value)}
                  disabled={submitting}
                  placeholder="Approval or management remarks..."
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Preparation and sign-off</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field id="inspection-prepared-by" label="Prepared by" required error={fieldErrors.preparedBy}>
                <Select
                  id="inspection-prepared-by"
                  value={form.preparedBy}
                  onChange={(event) => updateField("preparedBy", event.target.value)}
                  disabled={submitting}
                >
                  <option value="">Select preparer</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field id="inspection-user-signature" label="User signature" error={fieldErrors.user_signature}>
                <Input
                  id="inspection-user-signature"
                  value={form.userSignature}
                  onChange={(event) => updateField("userSignature", event.target.value)}
                  disabled={submitting}
                  placeholder="Name or reference"
                />
              </Field>

              <Field
                id="inspection-admin-signature"
                label="Admin signature"
                error={fieldErrors.admin_signature}
              >
                <Input
                  id="inspection-admin-signature"
                  value={form.adminSignature}
                  onChange={(event) => updateField("adminSignature", event.target.value)}
                  disabled={submitting}
                  placeholder="Name or reference"
                />
              </Field>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex items-center justify-end gap-2 pb-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/asset-inspections")}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || submitting}>
          <Save className="size-4" />
          {submitting ? "Saving..." : isEditing ? "Save changes" : "Create inspection"}
        </Button>
      </div>
    </form>
  );
}