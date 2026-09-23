import type { EntityId } from '../types'

export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(
  value?: string | null,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  },
): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, options).format(date)
}

export function formatDateTime(value?: string | null): string {
  return formatDate(value, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(value: unknown): string {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return '0'
  return new Intl.NumberFormat().format(numeric)
}

export function titleCase(value?: string | null): string {
  if (!value) return 'Unknown'
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function statusTone(value?: string | null): string {
  const normalized = (value || 'unknown').toLowerCase()
  if (['active', 'available', 'completed', 'resolved', 'healthy', 'new purchase'].some((item) => normalized.includes(item))) {
    return 'success'
  }
  if (['pending', 'assigned', 'in progress', 'in-house', 'maintenance'].some((item) => normalized.includes(item))) {
    return 'warning'
  }
  if (['repair', 'repaired', 'out-house', 'out of service'].some((item) => normalized.includes(item))) {
    return 'info'
  }
  if (['inactive', 'retired', 'disposed', 'cancelled', 'failed'].some((item) => normalized.includes(item))) {
    return 'danger'
  }
  return 'neutral'
}

export function todayIso(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function startOfWeekIso(): string {
  const date = new Date()
  const day = date.getDay()
  const distance = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - distance)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function entityKey(id: EntityId): string {
  return String(id)
}
