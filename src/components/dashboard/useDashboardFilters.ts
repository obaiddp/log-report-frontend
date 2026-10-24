import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import type { DashboardFilters } from "./types"
import { EMPTY_FILTERS, toLocalDateString } from "./types"

const DEBOUNCE_MS = 300

function parseFilters(searchParams: URLSearchParams): DashboardFilters {
  const get = (key: string) => searchParams.get(key) ?? ""
  const rawScope = get("scope")
  const scope =
    rawScope === "mine" || rawScope === "department" || rawScope === "all"
      ? rawScope
      : "mine"
  return {
    ...EMPTY_FILTERS,
    scope,
    from: get("from"),
    to: get("to"),
    department_id: get("department_id"),
    item_type_id: get("item_type_id"),
    status: get("status") as DashboardFilters["status"],
    asset_status: get("asset_status") as DashboardFilters["asset_status"],
    approval_status: get("approval_status") as DashboardFilters["approval_status"],
    created_by: get("created_by"),
    assigned_to: get("assigned_to"),
    prepared_by: get("prepared_by"),
    admin_user: get("admin_user"),
    preset: detectPreset(get("from"), get("to")),
  }
}

function detectPreset(from: string, to: string): DashboardFilters["preset"] {
  const today = toLocalDateString(new Date())
  for (const preset of ["last7", "last30", "thismonth"] as const) {
    let expectedFrom: string
    if (preset === "last7") expectedFrom = toLocalDateString(addDays(new Date(), -6))
    else if (preset === "last30") expectedFrom = toLocalDateString(addDays(new Date(), -29))
    else expectedFrom = toLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    if (from === expectedFrom && to === today) return preset
  }
  return "custom"
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function toSearchParams(f: DashboardFilters): URLSearchParams {
  const p = new URLSearchParams()
  for (const [key, value] of Object.entries(f)) {
    if (value !== "" && value !== null && value !== undefined) {
      p.set(key, String(value))
    }
  }
  if (f.scope) p.set("scope", f.scope)
  return p
}

export function useDashboardFilters() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [filters, setFilters] = useState(() => parseFilters(searchParams))
  const [version, setVersion] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Re-hydrate from the URL when it changes (back/forward, direct link).
  useEffect(() => {
    const next = parseFilters(searchParams)
    setFilters(next)
    setVersion((v) => v + 1)
  }, [searchParams])

  const updateFilters = useCallback(
    (next: Partial<DashboardFilters>) => {
      const updated = { ...filters, ...next }
      setFilters(updated)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        navigate(`?${toSearchParams(updated).toString()}`, { replace: true })
        setVersion((v) => v + 1)
      }, DEBOUNCE_MS)
    },
    [filters, navigate]
  )

  const activeCount = useMemo(
    () => {
      let count = 0
      const f = filters
      if (f.scope !== "mine") count++
      if (f.from) count++
      if (f.to) count++
      if (f.department_id) count++
      if (f.item_type_id) count++
      if (f.status) count++
      if (f.asset_status) count++
      if (f.approval_status) count++
      if (f.created_by) count++
      if (f.assigned_to) count++
      if (f.prepared_by) count++
      if (f.admin_user) count++
      return count
    },
    [filters]
  )

  const resetFilters = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    const empty: DashboardFilters = { ...EMPTY_FILTERS, preset: "custom" }
    setFilters(empty)
    navigate("?", { replace: true })
    setVersion((v) => v + 1)
  }, [navigate])

  return {
    filters,
    updateFilters,
    version,
    activeCount,
    resetFilters,
    DEBOUNCE_MS,
  }
}
