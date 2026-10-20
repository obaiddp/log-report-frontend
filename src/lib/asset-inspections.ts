import type { AssetApprovalStatus, AssetInspection, User } from "@/lib/api";

export function formatInspectionStatus(status: string | null | undefined): string {
  if (!status) return "Not set";

  return status
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/**
 * The logged in user, with the department the backend loads on /api/auth/me.
 * The auth context only types the fields the profile page needs.
 */
export type AssetInspectionUser = {
  id: number;
  name?: string;
  email?: string;
  designation?: string | null;
  department?: { id?: number; name?: string; code?: string } | null;
};

/** Name of a person, whether the API returned the user object or only an id. */
export function personName(value: number | User | null | undefined): string {
  if (value && typeof value === "object") {
    return value.name?.trim() || "—";
  }

  return "—";
}

export function preparedByName(inspection: AssetInspection): string {
  return personName(inspection.prepared_by);
}

export function adminUserName(inspection: AssetInspection): string {
  return personName(inspection.admin_user);
}

export function formatApprovalStatus(
  status: AssetApprovalStatus | null | undefined
): string {
  switch (status) {
    case "pending_admin":
      return "Awaiting admin";
    case "completed":
      return "Completed";
    case "returned":
      return "Returned";
    default:
      return "Unknown";
  }
}

export type ApprovalBadgeVariant = "outline" | "solved" | "destructive";

export function approvalBadgeVariant(
  status: AssetApprovalStatus | null | undefined
): ApprovalBadgeVariant {
  switch (status) {
    case "completed":
      return "solved";
    case "returned":
      return "destructive";
    default:
      return "outline";
  }
}

export function inspectionPreparerId(inspection: AssetInspection): number | null {
  const prepared = inspection.prepared_by;

  if (typeof prepared === "number") return prepared;

  return prepared?.id ?? null;
}

export function inspectionAdminId(inspection: AssetInspection): number | null {
  const admin = inspection.admin_user;

  if (typeof admin === "number") return admin;

  return admin?.id ?? null;
}

/**
 * The ICT preparer owns the record until the admin completes it. The server
 * enforces the same rule, the UI only hides the actions.
 */
export function canEditInspection(
  inspection: AssetInspection,
  user: AssetInspectionUser | null | undefined
): boolean {
  if (!user) return false;
  if (user.department?.code !== "ict") return false;
  if (inspection.approval_status === "completed") return false;

  return inspectionPreparerId(inspection) === user.id;
}

/** Only the assigned admin can sign or return a pending inspection. */
export function canSignInspection(
  inspection: AssetInspection,
  user: AssetInspectionUser | null | undefined
): boolean {
  if (!user) return false;
  if (inspection.approval_status !== "pending_admin") return false;

  return inspectionAdminId(inspection) === user.id;
}

export function inspectionSearchText(inspection: AssetInspection): string {
  return [
    inspection.username,
    inspection.designation,
    inspection.email,
    inspection.cell,
    inspection.department?.name,
    inspection.item_type?.name,
    inspection.brand,
    inspection.model,
    inspection.serial_number,
    inspection.item_tag,
    inspection.item_problem,
    inspection.status,
    inspection.approval_status,
    adminUserName(inspection),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function orDash(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}
