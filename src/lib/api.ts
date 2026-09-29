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

  console.log("Requesting:", `${API_URL}${endpoint}`, options);
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

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