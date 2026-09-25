import axios, {
  AxiosHeaders,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'
import type { FieldErrors } from '../types'

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
).replace(/\/$/, '')

export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/?$/, '')

/**
 * The API is accessed with Laravel Sanctum's SPA cookie session. No bearer
 * token is stored by the frontend; Axios reads the XSRF cookie and sends the
 * corresponding header for browser requests.
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const prefix = `${encodeURIComponent(name)}=`
  const cookie = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
  if (!cookie) return undefined
  try {
    return decodeURIComponent(cookie.slice(prefix.length))
  } catch {
    return cookie.slice(prefix.length)
  }
}

type UnauthorizedHandler = () => void
let unauthorizedHandler: UnauthorizedHandler | undefined

export function setUnauthorizedHandler(handler?: UnauthorizedHandler): void {
  unauthorizedHandler = handler
}

api.interceptors.request.use((config) => {
  config.withCredentials = true
  const token = readCookie('XSRF-TOKEN')
  if (token) {
    const headers = AxiosHeaders.from(config.headers)
    headers.set('X-XSRF-TOKEN', token)
    config.headers = headers
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      unauthorizedHandler?.()
    }
    // 403 is intentionally not handled as an authentication failure. The
    // page that made the request should explain the authorization boundary.
    return Promise.reject(error)
  },
)

export async function get<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.get<T>(url, config)
  return response.data
}

/** Prime Laravel Sanctum's SPA session before sending a credentialed login. */
export async function initializeCsrfCookie(): Promise<void> {
  await api.get('/sanctum/csrf-cookie', { baseURL: API_ROOT_URL })
}

async function mutate<T>(
  method: 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.request<T>({
    ...config,
    method,
    url,
    data,
  })
  return response.data
}

export function post<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return mutate<T>('post', url, data, config)
}

export function put<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return mutate<T>('put', url, data, config)
}

export function patch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  return mutate<T>('patch', url, data, config)
}

export function destroy<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  return mutate<T>('delete', url, undefined, config)
}

export async function downloadCsv(
  params: Record<string, string | number | undefined>,
  url = '/v1/reports/export',
): Promise<AxiosResponse<Blob>> {
  return api.get<Blob>(url, {
    params,
    responseType: 'blob',
  })
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'Unable to reach the server. Check your connection and try again.'
    }

    const data = error.response.data as
      | { message?: unknown; error?: unknown }
      | string
      | undefined

    if (typeof data === 'string' && data.trim()) return data
    if (data && typeof data === 'object') {
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message
      }
      if (typeof data.error === 'string' && data.error.trim()) return data.error
    }

    if (error.response.status === 403) {
      return 'You do not have permission to perform this action.'
    }
    if (error.response.status === 422) {
      return 'Please review the highlighted fields and try again.'
    }
  }

  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function getFieldErrors(error: unknown): FieldErrors {
  if (!axios.isAxiosError(error)) return {}

  const data = error.response?.data as
    | { errors?: unknown; message?: unknown; data?: { errors?: unknown } }
    | undefined
  const errors = data?.errors ?? data?.data?.errors

  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return {}

  return Object.fromEntries(
    Object.entries(errors).map(([field, messages]) => [
      field,
      Array.isArray(messages) ? messages.map(String) : [String(messages)],
    ]),
  )
}

export function shouldIgnoreRequest(error: unknown): boolean {
  return axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError')
}
