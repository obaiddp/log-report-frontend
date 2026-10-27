import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import type { DashboardFilters } from "./types"
import { EMPTY_FILTERS, detectPreset } from "./types"

const DEBOUNCE_MS = 300

// Fields that only affect one section. Everything else (scope, preset, from,
// to, department_id, item_type_id) is shared by both sections: changing it
// bumps both versions so both sections refetch. A support-only field (for
// example "status") bumps only supportVersion, so only the support section
// refetches — one filter edit never costs more requests than it must.
const SUPPORT_GROUP: Array<keyof DashboardFilters> = [
  "scope",
  "preset",
  "from",
  "to",
  "department_id",
  "item_type_id",
  "status",
  "created_by",
  "assigned_to",
]

const ASSET_GROUP: Array<keyof DashboardFilters> = [
  "scope",
  "preset",
  "from",
  "to",
  "department_id",
  "item_type_id",
  "asset_status",
  "approval_status",
  "prepared_by",
  "admin_user",
]

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

/** Canonical representation of a filter set, used for equality checks only. */
function serializeFilters(f: DashboardFilters): string {
  return [
    f.scope,
    f.preset,
    f.from,
    f.to,
    f.department_id,
    f.item_type_id,
    f.status,
    f.asset_status,
    f.approval_status,
    f.created_by,
    f.assigned_to,
    f.prepared_by,
    f.admin_user,
  ].join("|")
}

function serializeGroup(
  f: DashboardFilters,
  keys: Array<keyof DashboardFilters>
): string {
  return keys.map((key) => String(f[key])).join("|")
}

function currentQuery(): string {
  return window.location.search.replace(/^\?/, "")
}

export function useDashboardFilters() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [filters, setFilters] = useState(() => parseFilters(searchParams))
  const [supportVersion, setSupportVersion] = useState(0)
  const [assetVersion, setAssetVersion] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Mirrors `filters` so event handlers and the debounce timer always read
  // the latest value without becoming effect dependencies.
  const filtersRef = useRef(filters)
  // Filters as of the last version bump, so the debounced commit knows
  // exactly which sections' inputs changed since the previous fetch.
  const committedRef = useRef(filters)

  // Applies a committed filter state: bumps the versions of the sections
  // whose inputs actually changed, then writes the URL when it differs.
  const commit = useCallback(
    (next: DashboardFilters, query: string | null) => {
      const prev = committedRef.current
      if (
        serializeGroup(next, SUPPORT_GROUP) !==
        serializeGroup(prev, SUPPORT_GROUP)
      ) {
        setSupportVersion((v) => v + 1)
      }
      if (
        serializeGroup(next, ASSET_GROUP) !==
        serializeGroup(prev, ASSET_GROUP)
      ) {
        setAssetVersion((v) => v + 1)
      }
      committedRef.current = next
      // query === null means the URL already holds this state (back/forward
      // navigation), so there is nothing to write.
      if (query !== null && query !== currentQuery()) {
        navigate(`?${query}`, { replace: true })
      }
    },
    [navigate]
  )

  // Re-hydrate from the URL when it changes (back/forward, direct link).
  // The equality check keeps this from firing on mount (state was parsed
  // from the same URL) and from re-firing after updateFilters' own debounced
  // navigate — otherwise versions would bump twice per filter change and
  // sections would refetch twice.
  useEffect(() => {
    const next = parseFilters(searchParams)
    if (serializeFilters(next) === serializeFilters(filtersRef.current)) return
    filtersRef.current = next
    setFilters(next)
    commit(next, null)
  }, [searchParams, commit])

  const updateFilters = useCallback(
    (next: Partial<DashboardFilters>) => {
      const updated = { ...filtersRef.current, ...next }
      // Nothing actually changed: no re-render, no refetch, no URL write.
      if (serializeFilters(updated) === serializeFilters(filtersRef.current)) {
        return
      }

      filtersRef.current = updated
      setFilters(updated)

      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        commit(updated, toSearchParams(updated).toString())
      }, DEBOUNCE_MS)
    },
    [commit]
  )

  // Stop the pending URL write when the page unmounts.
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    []
  )

  return {
    filters,
    updateFilters,
    supportVersion,
    assetVersion,
  }
}