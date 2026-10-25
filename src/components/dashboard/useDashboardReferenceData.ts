import { useEffect, useState } from "react"

import {
  getDashboardFilterOptions,
  getDepartments,
  getItems,
} from "@/lib/api"

import type { DashboardScope } from "./types"

export interface IdNameOption {
  id: number
  name: string
}

export interface DashboardReferenceData {
  departments: IdNameOption[]
  items: IdNameOption[]
  people: IdNameOption[]
  approvers: IdNameOption[]
  loading: boolean
}

/**
 * Loads the shared reference lists once for the whole dashboard — both
 * section filter bars read from this single load instead of each fetching
 * their own copy. Reloads when the scope changes, because the people and
 * approvers lists depend on it.
 */
export function useDashboardReferenceData(
  scope: DashboardScope
): DashboardReferenceData {
  const [departments, setDepartments] = useState<IdNameOption[]>([])
  const [items, setItems] = useState<IdNameOption[]>([])
  const [people, setPeople] = useState<IdNameOption[]>([])
  const [approvers, setApprovers] = useState<IdNameOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    void (async () => {
      // allSettled: one failing list must not blank the other selects.
      const [departmentsResult, itemsResult, optionsResult] =
        await Promise.allSettled([
          getDepartments().then((r) =>
            r.data.map((d) => ({ id: d.id, name: d.name }))
          ),
          getItems().then((r) => r.data.map((i) => ({ id: i.id, name: i.name }))),
          getDashboardFilterOptions(scope).then((r) => ({
            users: r.data.users.map((u) => ({ id: u.id, name: u.name })),
            approvers: r.data.approvers.map((u) => ({
              id: u.id,
              name: u.name,
            })),
          })),
        ])

      if (cancelled) return
      if (departmentsResult.status === "fulfilled") {
        setDepartments(departmentsResult.value)
      }
      if (itemsResult.status === "fulfilled") {
        setItems(itemsResult.value)
      }
      if (optionsResult.status === "fulfilled") {
        setPeople(optionsResult.value.users)
        setApprovers(optionsResult.value.approvers)
      }
      setLoading(false)
    })()

    return () => {
      cancelled = true
    }
  }, [scope])

  return { departments, items, people, approvers, loading }
}