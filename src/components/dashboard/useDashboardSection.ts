import { useCallback, useEffect, useRef, useState } from "react"

import { ApiError } from "@/lib/api"

export interface UseDashboardSectionResult<TData> {
  data: TData | null
  loading: boolean // true only on the very first load
  refreshing: boolean // true on refetches; old data stays visible and is dimmed
  error: string | null
  retry: () => void
}

// One in-flight request. Only the newest run may commit results; older runs
// are cancelled and their responses are discarded.
interface FetchRun {
  key: string
  cancelled: boolean
  settled: boolean
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

  // Latest `fetch` closure, kept in a ref. Section components create it
  // inline, so its identity changes on every render; the fetch effect below
  // must NOT depend on it, or it would re-run (and refetch) on every render.
  // The effect depends on primitives only.
  const fetchRef = useRef(fetch)
  useEffect(() => {
    fetchRef.current = fetch
  })

  // The one run currently allowed to commit results.
  const runRef = useRef<FetchRun | null>(null)
  // True once data has loaded successfully at least once. Everything after
  // that is a silent refresh (old data stays visible and dimmed).
  const hasLoadedRef = useRef(false)

  const startFetch = useCallback((key: string, isInitialLoad: boolean) => {
    if (runRef.current) runRef.current.cancelled = true
    const run: FetchRun = { key, cancelled: false, settled: false }
    runRef.current = run

    if (isInitialLoad) setLoading(true)
    setRefreshing(true)
    setError(null)

    void (async () => {
      try {
        const response = await fetchRef.current()
        if (run.cancelled) return
        setData(response.data)
        hasLoadedRef.current = true
        setLoading(false)
        setRefreshing(false)
      } catch (err) {
        if (run.cancelled) return
        setError(err instanceof ApiError ? err.message : "Failed to load data.")
        setLoading(false)
        setRefreshing(false)
      } finally {
        run.settled = true
      }
    })()
  }, [])

  // All "real inputs" folded into one primitive string, so this effect
  // re-runs only when the section must actually fetch: on mount (when the
  // section is enabled), when filters/tab change (version bump) or on a
  // refresh tick (refreshKey bump). Never because a render happened.
  const triggerKey = `${enabled ? "1" : "0"}:${version}:${refreshKey}`

  useEffect(() => {
    if (!enabled) return

    const current = runRef.current
    if (current && current.key === triggerKey && !current.settled) {
      // A request for this exact trigger is already in flight. React
      // StrictMode intentionally runs mount effects twice; keep the first
      // request alive instead of sending a duplicate.
      current.cancelled = false
      return
    }

    startFetch(triggerKey, !hasLoadedRef.current)

    return () => {
      if (runRef.current && runRef.current.key === triggerKey) {
        runRef.current.cancelled = true
      }
    }
  }, [triggerKey, enabled, startFetch])

  const retry = useCallback(() => {
    if (!enabled) return
    startFetch(
      `${version}:${refreshKey}:retry:${Date.now()}`,
      !hasLoadedRef.current
    )
  }, [enabled, version, refreshKey, startFetch])

  return { data, loading, refreshing, error, retry }
}