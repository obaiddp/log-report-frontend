import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { FieldErrors } from '../types'

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
).replace(/\/$/, '')

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: {
    Accept: 'application/json',
  },
})

export async function get<T>(
  url: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await api.get<T>(url, config)
  return response.data
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
  params: Record<string, string | undefined>,
): Promise<AxiosResponse<Blob>> {
  return api.get<Blob>('/v1/reports/export', {
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
  }

  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function getFieldErrors(error: unknown): FieldErrors {
  if (!axios.isAxiosError(error)) return {}

  const data = error.response?.data as
    | { errors?: unknown; message?: unknown }
    | undefined
  const errors = data?.errors

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
