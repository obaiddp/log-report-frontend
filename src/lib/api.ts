const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()

export const API_BASE_URL = (
  configuredApiUrl || 'http://localhost:8000/api'
).replace(/\/+$/, '')

export type HealthResponse = {
  status: 'ok'
  service: string
}

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const response = value as Record<string, unknown>

  return response.status === 'ok' && typeof response.service === 'string'
}

export async function getHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/v1/health`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    credentials: 'include',
    signal,
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}.`)
  }

  const data: unknown = await response.json()

  if (!isHealthResponse(data)) {
    throw new Error('Health check returned an unexpected response.')
  }

  return data
}
