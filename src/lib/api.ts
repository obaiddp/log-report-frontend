// async function request<T>(
//   endpoint: string,
//   options: RequestInit = {}
// ): Promise<T> {
//   const headers = new Headers(options.headers);

//   headers.set("Accept", "application/json");

//   if (options.body) {
//     headers.set("Content-Type", "application/json");
//   }

//   const xsrfToken = getXsrfToken();

//   if (xsrfToken) {
//     headers.set("X-XSRF-TOKEN", xsrfToken);
//   }

//   console.log("Requesting:", `${API_URL}${endpoint}`, options);
//   const response = await fetch(`${API_URL}${endpoint}`, {
//     ...options,
//     credentials: "include",
//     headers,
//   });

//   const data = await response.json();

//   if (!response.ok) {
//     throw new Error(data.message || "Something went wrong");
//   }

//   return data;
// }

// ====================================================

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

// ================================== New

// export type User = {
// Schema::create('users', function (Blueprint $table) {
//             $table->id();

//             $table->string('name');
//             $table->string('email')->unique();
//             $table->timestamp('email_verified_at')->nullable();
//             $table->string('password');

//             $table->foreignId('role_id')->constrained()->restrictOnDelete();

//             $table->string('designation')->nullable();

//             $table->timestamps();
//         });  
//     }


// ---------- User ----------

export type User = { id: number; name: string; email: string; role_id: number; designation: string | null; };

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

export function deleteSupportLog(id: number) {
  return request<{
    status: string;
    data: SupportLog;
  }>(`/api/support-logs/${id}`, {
    method: "DELETE",
  });
}

/*

SQLSTATE[23001]: Restrict violation: 7 ERROR: update or delete on table "item_types" violates RESTRICT setting of foreign key constraint "support_logs_item_type_id_foreign" on table "support_logs" DETAIL: Key (id)=(9) is referenced from table "support_logs". (Connection: pgsql, Host: 127.0.0.1, Port: 5432, Database: it_support_log, SQL: delete from "item_types" where "id" = 9)

*/