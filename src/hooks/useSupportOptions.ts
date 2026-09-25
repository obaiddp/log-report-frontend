import { useCallback, useEffect, useState } from 'react'
import { get, getErrorMessage, shouldIgnoreRequest } from '../lib/api'
import { listData } from '../lib/support'
import type {
  Department,
  EntityId,
  ItemType,
  IssueType,
  Paginated,
  User,
} from '../types'

interface SupportOptionsResponse {
  departments?: Department[] | Paginated<Department>
  issue_types?: IssueType[] | Paginated<IssueType>
  item_types?: ItemType[] | Paginated<ItemType>
  technical_resources?: User[] | Paginated<User>
}

export interface SupportOptions {
  departments: Department[]
  users: User[]
  issueTypes: IssueType[]
  itemTypes: ItemType[]
  loading: boolean
  error: string
  reload: () => void
}

export function useSupportOptions(): SupportOptions {
  const [departments, setDepartments] = useState<Department[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([])
  const [itemTypes, setItemTypes] = useState<ItemType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const reload = useCallback(() => setReloadKey((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')

    void get<SupportOptionsResponse>('/v1/support-log-options', { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return
        setDepartments(listData(response.departments))
        setIssueTypes(listData(response.issue_types))
        setItemTypes(listData(response.item_types))
        setUsers(listData(response.technical_resources))
      })
      .catch((requestError: unknown) => {
        if (!shouldIgnoreRequest(requestError) && !controller.signal.aborted) {
          setError(getErrorMessage(requestError))
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [reloadKey])

  return {
    departments,
    users,
    issueTypes,
    itemTypes,
    loading,
    error,
    reload,
  }
}

export function userCanBeAssigned(user: User): boolean {
  return user.status !== 'inactive' && (user.role === 'technical_resource' || user.role === 'admin')
}

export function userDisplayName(user: User): string {
  return user.name || user.email || `User ${user.id}`
}

export function optionId(value: EntityId): string {
  return String(value)
}
