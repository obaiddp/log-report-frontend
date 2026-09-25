import type {
  Department,
  EntityId,
  ItemType,
  IssueType,
  Paginated,
  SupportLog,
  SupportReference,
  User,
} from '../types'

export interface ChartDatum {
  name: string
  value: number
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function unwrapResource<T>(response: T | { data: T }): T {
  if (isRecord(response) && 'data' in response) {
    const keys = Object.keys(response)
    const isEnvelope = keys.length === 1 || keys.every((key) => key === 'data' || key === 'meta' || key === 'links')
    if (isEnvelope && isRecord(response.data)) return response.data as T
  }
  return response as T
}

export function listData<T>(response: Paginated<T> | T[] | { data: T[] } | null | undefined): T[] {
  if (Array.isArray(response)) return response
  if (response && Array.isArray(response.data)) return response.data
  return []
}

export function paginationFrom<T>(
  response: Paginated<T> | T[] | null | undefined,
  fallbackPage = 1,
): { current_page: number; last_page: number; total: number } {
  if (Array.isArray(response)) {
    return { current_page: 1, last_page: 1, total: response.length }
  }
  return {
    current_page: response?.meta?.current_page ?? fallbackPage,
    last_page: response?.meta?.last_page ?? 1,
    total: response?.meta?.total ?? response?.data?.length ?? 0,
  }
}

export function entityId(value: unknown): EntityId | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'string' || typeof value === 'number') return value
  if (isRecord(value) && (typeof value.id === 'string' || typeof value.id === 'number')) {
    return value.id
  }
  return undefined
}

export function referenceId(value: SupportReference | undefined): EntityId | undefined {
  return entityId(value)
}

export function referenceName(
  value: SupportReference | undefined,
  fallback = 'Unassigned',
): string {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (isRecord(value) && typeof value.name === 'string' && value.name.trim()) return value.name
  return fallback
}

export function userName(value: SupportReference | undefined, fallback = 'Unknown user'): string {
  return referenceName(value, fallback)
}

export function departmentName(
  value: string | Department | null | undefined,
  fallback = 'Unassigned department',
): string {
  if (typeof value === 'string' && value.trim()) return value
  if (isRecord(value) && typeof value.name === 'string') return value.name
  return fallback
}

export function itemTypeName(
  value: string | ItemType | null | undefined,
  fallback = 'No item selected',
): string {
  if (typeof value === 'string' && value.trim()) return value
  if (isRecord(value) && typeof value.name === 'string') return value.name
  return fallback
}

export function issueTypeName(
  value: EntityId | IssueType | string,
  index = 0,
  options: IssueType[] = [],
): string {
  if (isRecord(value) && typeof value.name === 'string') return value.name
  const id = entityId(value)
  if (id !== undefined) {
    const match = options.find((option) => String(option.id) === String(id))
    if (match) return match.name
    return `Issue type ${id}`
  }
  return `Issue type ${index + 1}`
}

export function issueTypeNames(
  values: SupportLog['issue_types'],
  options: IssueType[] = [],
): string[] {
  if (!Array.isArray(values)) return []
  return values.map((value, index) => issueTypeName(value, index, options))
}

export function uniqueOptions<T extends { id: EntityId }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = String(item.id)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function isAdmin(user: User | null | undefined): boolean {
  return user?.role === 'admin'
}

export function isTechnicalResource(user: User | null | undefined): boolean {
  return user?.role === 'technical_resource'
}

export function canEditSupportLog(user: User | null | undefined, log: SupportLog): boolean {
  if (!user) return false
  if (isAdmin(user)) return true
  // Technical resources can update their assigned queue. Administrators can
  // update every record; the API remains the final authorization boundary.
  const userId = String(user.id)
  const assignedId = referenceId(log.assigned_to)
  const assignedIdMatches = assignedId !== undefined && String(assignedId) === userId
  const assignedNameMatches = Boolean(
    user.name &&
      referenceName(log.assigned_resource, '').toLowerCase() === user.name.trim().toLowerCase(),
  )
  return assignedIdMatches || assignedNameMatches
}

export function canDeleteSupportLog(user: User | null | undefined): boolean {
  return isAdmin(user)
}

export function getInitials(name?: string | null): string {
  const parts = (name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function unwrapReportPayload(value: unknown): unknown {
  let payload = value
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (!isRecord(payload) || !('data' in payload)) break
    const keys = Object.keys(payload)
    if (!(keys.length === 1 || keys.every((key) => key === 'data' || key === 'meta' || key === 'links'))) break
    payload = payload.data
  }
  return payload
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = record[key]
    const numeric = typeof value === 'number' ? value : Number(value)
    if (Number.isFinite(numeric)) return numeric
  }
  return 0
}

function firstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return 'Unspecified'
}

export function normalizeChartData(
  input: unknown,
  labelKeys: string[] = ['name', 'label', 'status', 'name'],
  valueKeys: string[] = ['count', 'total', 'value'],
): ChartDatum[] {
  const payload = unwrapReportPayload(input)
  if (Array.isArray(payload)) {
    return payload.flatMap((item) => {
      if (!isRecord(item)) return []
      const name = firstString(item, labelKeys)
      const value = firstNumber(item, valueKeys)
      return name ? [{ name, value }] : []
    })
  }
  if (isRecord(payload)) {
    return Object.entries(payload).flatMap(([name, value]) => {
      if (isRecord(value)) {
        return [{ name, value: firstNumber(value, valueKeys) }]
      }
      const numeric = typeof value === 'number' ? value : Number(value)
      return [{ name, value: Number.isFinite(numeric) ? numeric : 0 }]
    })
  }
  return []
}

export function dashboardMetrics(summary: Record<string, unknown> | null | undefined): {
  total: number
  open: number
  inProgress: number
  resolved: number
  closed: number
  indoorRepair: number
  outdoorRepair: number
  unassigned: number
  critical: number
  overdue: number
  createdToday: number
  createdThisWeek: number
  averageResolutionHours: number | null
} {
  const source = isRecord(summary?.metrics) ? summary.metrics : isRecord(summary) ? summary : {}
  const total = firstNumber(source, ['total_logs', 'total_support_logs', 'total_records', 'support_logs', 'total', 'count', 'logs'])
  const status = normalizeChartData(summary?.status_breakdown ?? summary?.by_status ?? summary?.statuses, ['status', 'status_name', 'name', 'label'], ['count', 'total', 'value'])
  const priority = normalizeChartData(summary?.priority_breakdown ?? summary?.by_priority ?? summary?.priorities, ['priority', 'priority_name', 'name', 'label'], ['count', 'total', 'value'])
  const open = firstNumber(source, ['open_logs', 'open', 'open_count']) || status.find((item) => item.name === 'open')?.value || 0
  const inProgress = firstNumber(source, ['in_progress_logs', 'in_progress', 'in_progress_count']) || status.find((item) => item.name === 'in_progress')?.value || 0
  const resolvedFromStatus = status
    .filter((item) => ['resolved', 'closed'].includes(item.name))
    .reduce((sum, item) => sum + item.value, 0)
  const resolved = firstNumber(source, ['resolved_logs', 'resolved', 'resolved_count']) || resolvedFromStatus
  const closed = firstNumber(source, ['closed_logs', 'closed', 'closed_count'])
  const indoorRepair = firstNumber(source, ['indoor_repair_logs', 'indoor_repair', 'indoor_repair_count'])
  const outdoorRepair = firstNumber(source, ['outdoor_repair_logs', 'outdoor_repair', 'outdoor_repair_count'])
  const unassigned = firstNumber(source, ['unassigned_logs', 'unassigned', 'unassigned_count'])
  const critical = firstNumber(source, ['critical_logs', 'critical', 'critical_count']) || priority.find((item) => item.name === 'critical')?.value || 0
  const overdue = firstNumber(source, ['overdue', 'overdue_count'])
  const createdToday = firstNumber(source, ['created_today', 'today', 'today_count'])
  const createdThisWeek = firstNumber(source, ['created_this_week', 'week', 'week_count'])
  const rawAverage = source.average_resolution_time_hours
  const averageResolutionHours = rawAverage === null || rawAverage === undefined || rawAverage === ''
    ? null
    : Number.isFinite(Number(rawAverage))
      ? Number(rawAverage)
      : null
  return { total, open, inProgress, resolved, closed, indoorRepair, outdoorRepair, unassigned, critical, overdue, createdToday, createdThisWeek, averageResolutionHours }
}

export function cleanQuery<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as Partial<T>
}

export function sortDirectionValue(value: string | undefined): 'asc' | 'desc' {
  return value === 'asc' ? 'asc' : 'desc'
}
