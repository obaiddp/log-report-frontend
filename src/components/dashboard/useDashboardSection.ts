import { useCallback, useEffect, useRef, useState } from "react"

import { ApiError } from "@/lib/api"

export interface UseDashboardSectionResult<TData> {
  data: TData | null
  loading: boolean // true only on the very first load
  refreshing: boolean // true on refetches; old data stays visible and is dimmed
  error: string | null
  retry: () => void
}

export function useDashboardSection<TData>({
  enabled,
  version,
  refreshKey,
  fetch,
}: {
  enabled: boolean
  version: number
  refreshKey: number
  fetch: () => Promise<{ data: TData }>
}): UseDashboardSectionResult<TData> {
  const [data, setData] = useState<TData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cancelledRef = useRef(false)

  const fetchData = useCallback(
    async (isRefresh: boolean) => {
      if (!enabled) return
      cancelledRef.current = false
      try {
        if (!isRefresh) setLoading(true)
        setRefreshing(true)
        setError(null)
        const response = await fetch()
        if (cancelledRef.current) return
        setData(response.data)
        if (!isRefresh) setLoading(false)
      } catch (err) {
        if (cancelledRef.current) return
        setError(
          err instanceof ApiError ? err.message : "Failed to load data."
        )
        if (!isRefresh) setLoading(false)
      } finally {
        if (!cancelledRef.current) {
          setRefreshing(false)
        }
      }
    },
    [enabled, fetch]
  )

  useEffect(() => {
    cancelledRef.current = false
    void fetchData(false)
    return () => {
      cancelledRef.current = true
    }
  }, [enabled, version, fetchData])

  // Silent background refresh (auto-refresh). Keeps old data visible, dims it.
  useEffect(() => {
    if (!enabled) return
    cancelledRef.current = false
    void fetchData(true)
    return () => {
      cancelledRef.current = true
    }
  }, [refreshKey, fetchData, enabled])

  const retry = useCallback(() => {
    void fetchData(false)
  }, [fetchData])

  return { data, loading, refreshing, error, retry }
}
