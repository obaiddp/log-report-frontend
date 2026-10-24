// const API_URL =
//   import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const API_URL = (
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : "")
).replace(/\/+$/, "");

function getXsrfToken(): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(
    cookie.slice("XSRF-TOKEN=".length)
  );
}

// ====================================================

export async function getCsrfCookie() {
  const response = await fetch(`${API_URL}/sanctum/csrf-cookie`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to initialize CSRF protection.");
  }
}

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  const xsrfToken = getXsrfToken();

  if (xsrfToken) {
    headers.set("X-XSRF-TOKEN", xsrfToken);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      data?.message || "Something went wrong",
      response.status,
      data?.errors
    );
  }

  return data as T;
}


// ====================================================

// ---------- Permission names (must match PermissionSeeder) ----------
export type PermissionName =
  | "manage_dashboard"
  | "dashboard_support_logs"
  | "dashboard_asset_inspections"
  | "user_performance"
  | "dashboard_department_view"
  | "dashboard_all_view"
  | "manage_support_logs"
  | "manage_asset_inspections"
  | "create_asset_inspections"
  | "manage_departments"
  | "manage_item_types"
  | "manage_issue_types"
  | "manage_users"
  | "manage_role_permissions";

// Permissions only super_admin may ever hold (server enforces this too)
export const RESERVED_PERMISSIONS: PermissionName[] = [
  "manage_users",
  "manage_role_permissions",
];

export type RoleName =
  | "super_admin"
  | "ict_manager"
  | "ict_staff"
  | "admin_approver";

// ---------- Auth ----------
// login returns:  { data: User(with role.permissions), role, permissions }
// me returns:     { user_from_request: User, role, permissions, ...debug keys }
export type AuthLoginResponse = {
  data: User;
  role: RoleName | null;
  permissions: PermissionName[];
};

export type AuthMeResponse = {
  user_from_request: User;
  role: RoleName | null;
  permissions: PermissionName[];
};

export async function login(email: string, password: string) {
  await getCsrfCookie();

  return request<AuthLoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export async function getMe() {
  return request<AuthMeResponse>("/api/auth/me");
}

export async function logout() {
  return request("/api/auth/logout", {
    method: "POST",
  });
}


// ---------- Role ----------
export type Role = {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  permissions?: Permission[];
};

export function getRoles() {
  return request<{ status: string; data: Role[] }>("/api/roles");
}

// ---------- Permission ----------
export type Permission = {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  pivot?: {
    role_id: number;
    permission_id: number;
    created_at?: string;
    updated_at?: string;
  };
};

export type RolePermissionsResponse = {
  status: string;
  data: Permission[];
};

export type UpdateRolePermissionsResponse = {
  status: string;
  message: string;
  data: {
    role: Role;
    permission: Permission[]; // matches backend (singular)
  };
};

export function getPermissions() {
  return request<{ status: string; data: Permission[] }>("/api/permissions");
}

// Get permissions currently assigned to a role
export function getRolePermissions(roleId: number) {
  return request<RolePermissionsResponse>(`/api/roles/${roleId}/permissions`);
}

// Bulk update / sync permissions for a role.
// Server returns 403 for the super_admin role, and when manage_users or
// manage_role_permissions is included for any other role.
export function updateRolePermissions(roleId: number, permissionIds: number[]) {
  return request<UpdateRolePermissionsResponse>(`/api/roles/${roleId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({
      permission_ids: permissionIds,
    }),
  });
}


// ---------- User ----------
export type User = {
  id: number;
  name: string;
  email: string;
  designation: string | null;
  role_id: number;
  department_id?: number;
  role?: Role;
  department?: Department;
};

// Matches postUsers validation: all five fields are required
export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  designation: string;
  role_id: number;
};

// Matches updateUserById validation: email is NOT updatable, password optional
export type UpdateUserPayload = {
  name?: string;
  password?: string;
  designation?: string;
  role_id?: number;
};

// permission: manage_users (super_admin only)
export function getUsers() {
  return request<{ status: string; data: User[] }>("/api/users");
}

export function getUser(id: number) {
  return request<{ status: string; data: User }>(`/api/users/${id}`);
}

export function createUser(payload: CreateUserPayload) {
  return request<{ status: string; data: User }>("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(id: number, payload: UpdateUserPayload) {
  return request<{ status: string; data: User }>(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteUser(id: number) {
  return request<{ status: string; message: string }>(`/api/users/${id}`, {
    method: "DELETE",
  });
}

// Approver picker for the inspection form.
// permission: create_asset_inspections. Already limited by the server to
// the admin-log department and excludes the logged-in user.
export type Approver = {
  id: number;
  name: string;
  designation: string | null;
};

export function getApprovers() {
  return request<{ status: string; data: Approver[] }>("/api/approvers");
}

// ---------- Departments ----------
export type Department = { id: number; name: string; code: string };

// GET is open to any logged-in user; write actions need manage_departments
export function getDepartments() {
  return request<{ status: string; data: Department[] }>("/api/departments");
}

export function createDepartment(name: string, code: string) {
  return request<{ status: string; data: Department }>("/api/departments", {
    method: "POST",
    body: JSON.stringify({ name, code }),
  });
}

export function updateDepartment(id: number, name: string) {
  return request<{ status: string; data: Department }>(`/api/departments/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function deleteDepartment(id: number) {
  return request<{ status: string; message: string }>(`/api/departments/${id}`, {
    method: "DELETE",
  });
}

// ---------- Issues ----------
export type Issue = { id: number; name: string };

export function getIssues() {
  return request<{ status: string; data: Issue[] }>("/api/issues");
}

export function createIssue(name: string) {
  return request<{ status: string; data: Issue }>("/api/issues", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateIssue(id: number, name: string) {
  return request<{ status: string; data: Issue }>(`/api/issues/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function deleteIssue(id: number) {
  return request<{ status: string; message: string }>(`/api/issues/${id}`, {
    method: "DELETE",
  });
}

// ---------- Items ----------
export type Item = { id: number; name: string; has_specification: boolean };

export function getItems() {
  return request<{ status: string; data: Item[] }>("/api/items");
}

export function createItem(name: string, has_specification: boolean ) {
  return request<{ status: string; data: Item }>("/api/items", {
    method: "POST",
    body: JSON.stringify({ name, has_specification }),
  });
}

export function updateItem(id: number, name: string ) {
  return request<{ status: string; data: Item }>(`/api/items/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
  });
}

export function updateItemHasSpecification(id: number, has_specification: boolean) {
  return request<{ status: string; data: Item }>(`/api/items/${id}`, {
    method: "PUT",
    body: JSON.stringify({ has_specification }),
  });
}

export function deleteItem(id: number) {
  return request<{ status: string; message: string }>(`/api/items/${id}`, {
    method: "DELETE",
  });
}

// ---------- Support Logs / Log Report ----------

export type SupportLogStatus =
  | "indoor_repairing"
  | "outdoor_repairing"
  | "solved";

export type SupportLog = {
  id: number;
  ticket_number: string;
  issue_date: string;
  initiated_by: string;

  department_id: number;
  item_type_id: number;

  status: SupportLogStatus;
  issue_details: string | null;

  created_by: number;
  assigned_to: number | null;

  department?: Department;
  item_type?: Item;
  issue_types?: Issue[];
  creator?: User;
  assigned_resource?: User;

  created_at: string;
  updated_at: string;
};

export function getSupportLogs() {
  return request<{
    status: string;
    data: SupportLog[];
  }>("/api/support-logs");
}

export function getSupportLog(id: number) {
  return request<{
    status: string;
    data: SupportLog;
  }>(`/api/support-logs/${id}`);
}

export function createSupportLog(data: {
  issue_date: string;
  initiated_by: string;
  department_id: number;
  item_type_id: number;
  issue_type_ids?: number[];
  status?: SupportLogStatus;
  issue_details?: string;
  assigned_to?: number;
}) {
  return request<{
    status: string;
    data: SupportLog;
  }>("/api/support-logs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateSupportLogStatus(
  id: number,
  status: SupportLogStatus
) {
  return request<{
    status: string;
    message: string;
    data: SupportLog;
  }>(`/api/support-logs/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

/*
 ---- later will add other fields updating in updateSupportLog
*/

export function deleteSupportLog(id: number) {
  return request<{
    status: string;
    data: SupportLog;
  }>(`/api/support-logs/${id}`, {
    method: "DELETE",
  });
}
// ---------- Asset Inspections ----------
export type AssetInspectionStatus = string;

export type AssetApprovalStatus = "pending_admin" | "completed" | "returned";

export type AssetInspection = {
  id: number;

  // Person bringing the item
  username: string;
  designation: string | null;
  email: string | null;
  cell: string | null;

  // Inspection details
  department_id: number;
  territory: string | null;
  status: AssetInspectionStatus | null; // item status, not approval status

  item_type_id: number;
  model: string;
  brand: string;
  serial_number: string | null;
  item_tag: string | null;

  // Hardware specifications
  ram: string | null;
  generation: string | null;
  hard_drive: string | null;

  // Problem and remarks
  item_problem: string | null;
  it_remarks: string | null;
  admin_remarks: string | null;

  // Approval workflow (all set by the server)
  approval_status: AssetApprovalStatus;
  return_reason: string | null;

  // The API loads these relations, and Laravel serializes the relation over
  // the column, so these are User objects on every read endpoint.
  prepared_by: number | User;
  admin_user: number | User;

  prepared_by_digital_signature: boolean;
  user_digital_signature: boolean;
  admin_digital_signature: boolean;

  prepared_signed_at: string | null;
  user_signed_at: string | null;
  admin_signed_at: string | null;

  // Relationships returned by Laravel
  department?: Department;
  item_type?: Item;

  created_at: string;
  updated_at: string;
};

// Create: signatures and prepared_by are set by the server.
// user_digital_signature must be true (IT confirms the user acknowledged).
// admin_user must be an id returned by getApprovers().
export type AssetInspectionInput = {
  username: string;
  designation?: string | null;
  email?: string | null;
  cell?: string | null;

  department_id: number;
  territory?: string | null;
  status?: AssetInspectionStatus | null;

  item_type_id: number;
  model: string;
  brand: string;
  serial_number?: string | null;
  item_tag?: string | null;

  ram?: string | null;
  generation?: string | null;
  hard_drive?: string | null;

  item_problem?: string | null;
  it_remarks?: string | null;

  admin_user: number;
  user_digital_signature: true;
};

// Update: same fields, all optional, and no acknowledgement flag.
export type AssetInspectionUpdateInput = Partial<
  Omit<AssetInspectionInput, "user_digital_signature">
>;

export type AssetInspectionSignInput = {
  admin_remarks?: string | null;
};

export type AssetInspectionReturnInput = {
  return_reason: string;
  admin_remarks?: string | null;
};

// permission: manage_asset_inspections.
// Server returns all forms to super_admin / ict_manager; everyone else only
// the forms they prepared or are assigned to approve.
export function getAssetInspections() {
  return request<{
    status: string;
    data: AssetInspection[];
  }>("/api/asset-inspections");
}

// Get one asset inspection (403 if not preparer, assigned admin or manager)
export function getAssetInspection(id: number) {
  return request<{
    status: string;
    data: AssetInspection;
  }>(`/api/asset-inspections/${id}`);
}

// Create an asset inspection (permission: create_asset_inspections)
export function createAssetInspection(data: AssetInspectionInput) {
  return request<{
    status: string;
    message: string;
    data: AssetInspection;
  }>("/api/asset-inspections", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update (permission: create_asset_inspections, and must be the preparer)
export function updateAssetInspection(id: number, data: AssetInspectionUpdateInput) {
  return request<{
    status: string;
    message: string;
    data: AssetInspection;
  }>(`/api/asset-inspections/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

// Sign as the assigned admin; completes the inspection
export function signAssetInspection(id: number, data: AssetInspectionSignInput = {}) {
  return request<{
    status: string;
    message: string;
    data: AssetInspection;
  }>(`/api/asset-inspections/${id}/sign-admin`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Return to the ICT preparer with a reason (assigned admin)
export function returnAssetInspection(id: number, data: AssetInspectionReturnInput) {
  return request<{
    status: string;
    message: string;
    data: AssetInspection;
  }>(`/api/asset-inspections/${id}/return`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Delete (permission: create_asset_inspections, and must be the preparer)
export function deleteAssetInspection(id: number) {
  return request<{
    status: string;
    message?: string;
  }>(`/api/asset-inspections/${id}`, {
    method: "DELETE",
  });
}


// ---------- Dashboard (scoped + filterable) ----------
// scope: mine = my records, department = my department, all = everything.
// department needs dashboard_department_view, all needs dashboard_all_view.
export type DashboardScope = "mine" | "department" | "all";

export type LabelCount = { label: string | null; total: number };
export type NamedCount = { id: number | null; name: string; total: number };
export type DayCount = { day: string; total: number }; // day = YYYY-MM-DD
export type PersonApprovalCount = {
  id: number;
  name: string;
  total: number;
  pending: number;
  returned: number;
  completed: number;
};

// Dates are YYYY-MM-DD. Empty values are not sent.
export type SupportLogDashboardFilters = {
  scope?: DashboardScope;
  from?: string;
  to?: string;
  department_id?: number;
  item_type_id?: number;
  status?: SupportLogStatus;
  created_by?: number;
  assigned_to?: number;
};

export type AssetInspectionDashboardFilters = {
  scope?: DashboardScope;
  from?: string;
  to?: string;
  department_id?: number;
  item_type_id?: number;
  status?: string; // item status, e.g. handover_for_repairing
  approval_status?: AssetApprovalStatus;
  prepared_by?: number;
  admin_user?: number;
};

function toQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

// permission: dashboard_support_logs
export type SupportLogDashboard = {
  scope: DashboardScope;
  summary: {
    total: number;
    solved: number;
    open: number;
    last_7_days: number;
    avg_resolution_hours: number | null;
  };
  by_status: LabelCount[];
  by_department: NamedCount[];
  by_item_type: NamedCount[];
  by_issue_type: NamedCount[];
  by_creator: NamedCount[];
  by_assignee: NamedCount[];
  trend: DayCount[];
};

export function getSupportLogDashboard(filters: SupportLogDashboardFilters = {}) {
  return request<{ status: string; data: SupportLogDashboard }>(
    `/api/dashboard/support-logs${toQuery(filters)}`
  );
}

// permission: dashboard_asset_inspections
export type AssetInspectionDashboard = {
  scope: DashboardScope;
  summary: {
    total: number;
    pending: number;
    returned: number;
    completed: number;
    avg_approval_hours: number | null;
    needs_my_signature: number; // personal, ignores scope and filters
    returned_to_me: number; // personal, ignores scope and filters
  };
  by_approval_status: LabelCount[];
  by_item_status: LabelCount[];
  by_department: NamedCount[];
  by_item_type: NamedCount[];
  by_preparer: PersonApprovalCount[];
  by_approver: PersonApprovalCount[];
  trend: DayCount[];
};

export function getAssetInspectionDashboard(
  filters: AssetInspectionDashboardFilters = {}
) {
  return request<{ status: string; data: AssetInspectionDashboard }>(
    `/api/dashboard/asset-inspections${toQuery(filters)}`
  );
}

// ---------- User performance ----------

export type UserPerformance = {
  user_id: number;
  name: string;
  tickets_assigned: number;
  tickets_resolved: number;
  avg_resolution_hours: number | null;
};

// permission: user_performance
export function getUserPerformance() {
  return request<{ status: string; data: UserPerformance[] }>(
    "/api/dashboard/user-performance"
  );
}

// permission: manage_dashboard. People for the filter dropdowns.
export type DashboardFilterOptions = {
  scope: DashboardScope;
  users: { id: number; name: string }[];
  approvers: { id: number; name: string }[];
};

export function getDashboardFilterOptions(scope: DashboardScope = "mine") {
  return request<{ status: string; data: DashboardFilterOptions }>(
    `/api/dashboard/filter-options${toQuery({ scope })}`
  );
}