import type { ReportSummary } from '../types'

interface SimpleDatum {
  name: string
  value: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function numberFrom(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const numeric = typeof record[key] === 'number' ? record[key] : Number(record[key])
    if (Number.isFinite(numeric)) return numeric
  }
  return 0
}

function statusValues(input: unknown): SimpleDatum[] {
  if (Array.isArray(input)) {
    return input.flatMap((item) => {
      if (!isRecord(item)) return []
      const name = String(item.status ?? item.name ?? item.label ?? '')
      const value = Number(item.count ?? item.total ?? item.value ?? 0)
      return name ? [{ name, value: Number.isFinite(value) ? value : 0 }] : []
    })
  }
  if (!isRecord(input)) return []
  return Object.entries(input).map(([name, value]) => ({ name, value: Number(value) || 0 }))
}

function purchaseValues(input: unknown): SimpleDatum[] {
  return statusValues(input)
}

export function reportMetrics(summary: ReportSummary) {
  const metrics = isRecord(summary.metrics) ? summary.metrics : {}
  const statusData = statusValues(summary.status_breakdown)
  const purchaseData = purchaseValues(summary.purchase_vs_repair)

  return {
    totalAssets: numberFrom(metrics, ['total_assets', 'assets', 'asset_count', 'total']),
    totalInspections: numberFrom(metrics, ['total_inspections', 'inspections', 'inspection_count', 'total']),
    repairs:
      numberFrom(metrics, ['total_repairs', 'repairs', 'repair_count']) ||
      purchaseData.find((item) => item.name.toLowerCase().includes('repair'))?.value ||
      0,
    pending:
      numberFrom(metrics, ['pending_inspections', 'pending', 'pending_count']) ||
      statusData.find((item) => item.name.toLowerCase().includes('pending'))?.value ||
      0,
  }
}
