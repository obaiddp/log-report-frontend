const API_URL = "http://127.0.0.1:8000";

function getXsrfToken(): string | null {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split("=")[1]);
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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    throw new ApiError(data?.message || "Something went wrong", response.status, data?.errors);
  }

  return data as T;
}


// ====================================================

// ---------- Auth ----------

export async function login(email: string, password: string) {
  await getCsrfCookie();

  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
    }),
  });
}

export async function getMe() {
  return request("/api/auth/me");
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

// Bulk update / sync permissions for a role
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
  role_id: number;
  role?: Role; 
  designation: string | null; 
};

export function getUsers() {
  return request<{ status: string; data: User[] }>("/api/users");
}

// ---------- Departments ----------
export type Department = { id: number; name: string; code: string };

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
export type Item = { id: number; name: string; };

export function getItems() {
  return request<{ status: string; data: Item[] }>("/api/items");
}

export function createItem(name: string ) {
  return request<{ status: string; data: Item }>("/api/items", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function updateItem(id: number, name: string ) {
  return request<{ status: string; data: Item }>(`/api/items/${id}`, {
    method: "PUT",
    body: JSON.stringify({ name }),
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


// ---------- Example User Object ----------
/*
{
        "id": 5,
        "name": "Obaid Ullah Zeb",
        "email": "obaid.ullah@cef.org.pk",
        "email_verified_at": "2026-10-02T11:01:33.000000Z",
        "role_id": 3,
        "designation": "Assistant Developer",
        "created_at": "2026-10-02T11:01:33.000000Z",
        "updated_at": "2026-10-02T11:01:33.000000Z"
    }
*/