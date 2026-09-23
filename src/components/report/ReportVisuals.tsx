import { BarChart3, ChartNoAxesCombined, Database, TrendingUp } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber, titleCase } from '../../lib/format'
import type { ReportSummary } from '../../types'
import { EmptyState, ErrorState, Skeleton } from '../ui'

const chartColors = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

interface ChartDatum {
  name: string
  value: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
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

function normalizeData(
  input: unknown,
  labelKeys: string[],
  valueKeys: string[],
): ChartDatum[] {
  if (Array.isArray(input)) {
    return input
      .map((item) => {
        if (!isRecord(item)) return null
        return {
          name: firstString(item, labelKeys),
          value: firstNumber(item, valueKeys),
        }
      })
      .filter((item): item is ChartDatum => item !== null)
  }

  if (isRecord(input)) {
    return Object.entries(input).map(([name, value]) => ({
      name: titleCase(name),
      value:
        typeof value === 'number'
          ? value
          : isRecord(value)
            ? firstNumber(value, valueKeys)
            : Number(value) || 0,
    }))
  }

  return []
}

function totalOf(data: ChartDatum[]): number {
  return data.reduce((total, item) => total + item.value, 0)
}

function accessibleSummary(title: string, data: ChartDatum[], unit = 'records'): string {
  if (data.length === 0) return `${title}: no data available.`
  const total = totalOf(data)
  const highest = data.reduce((current, item) => (item.value > current.value ? item : current))
  return `${title}: ${formatNumber(total)} ${unit} across ${data.length} categories. ${titleCase(highest.name)} is highest at ${formatNumber(highest.value)}.`
}

function ChartFrame({
  title,
  description,
  data,
  children,
  className = '',
  unit = 'records',
}: {
  title: string
  description: string
  data: ChartDatum[]
  children: ReactNode
  className?: string
  unit?: string
}) {
  const detailsId = useId().replace(/:/g, '')

  return (
    <article className={`panel chart-card ${className}`}>
      <div className="chart-card__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <BarChart3 size={21} aria-hidden="true" />
      </div>
      {data.length === 0 ? (
        <EmptyState title="No chart data" message="No records match this reporting period." />
      ) : (
        <>
          <div
            className="chart-container"
            role="img"
            aria-label={accessibleSummary(title, data, unit)}
          >
            {children}
          </div>
          <details className="data-alternative" aria-labelledby={detailsId}>
            <summary id={detailsId}>View accessible data table</summary>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">{title} data</caption>
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.name}>
                      <th scope="row">{titleCase(item.name)}</th>
                      <td>{formatNumber(item.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </article>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  unit = '',
}: {
  active?: boolean
  payload?: Array<{ value?: number | string; name?: string; color?: string }>
  label?: string | number
  unit?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <div className="chart-tooltip">
      <strong>{titleCase(String(label || point.name || 'Total'))}</strong>
      <span>{formatNumber(point.value)} {unit}</span>
    </div>
  )
}

export function ReportVisuals({
  summary,
  loading = false,
  error,
  onRetry,
}: {
  summary: ReportSummary
  loading?: boolean
  error?: string
  onRetry?: () => void
}) {
  if (loading) {
    return (
      <div className="charts-grid" aria-label="Loading report charts">
        {[0, 1, 2, 3, 4].map((item) => (
          <div className="panel chart-card" key={item}>
            <div className="chart-card__header">
              <div><h2>Loading chart</h2><p>Preparing reporting data</p></div>
            </div>
            <Skeleton count={3} />
          </div>
        ))}
      </div>
    )
  }

  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const assetData = normalizeData(
    summary.asset_distribution,
    ['type', 'name', 'label', 'asset_type'],
    ['count', 'total', 'value', 'assets'],
  )
  const statusData = normalizeData(
    summary.status_breakdown,
    ['status', 'name', 'label'],
    ['count', 'total', 'value'],
  )
  const ramData = normalizeData(
    summary.ram_usage_by_department,
    ['department', 'name', 'label'],
    ['ram_gb', 'ram', 'total', 'value', 'count'],
  )
  const purchaseData = normalizeData(
    summary.purchase_vs_repair,
    ['category', 'name', 'label', 'type'],
    ['count', 'total', 'value'],
  )
  const trendData = normalizeData(
    summary.inspection_trend,
    ['date', 'day', 'name', 'label', 'period'],
    ['count', 'total', 'value', 'inspections'],
  )
  const workloadData = normalizeData(
    summary.technician_workload,
    ['name', 'technician', 'technical_personnel', 'label'],
    ['count', 'total', 'value', 'workload', 'inspections'],
  )

  return (
    <div className="charts-grid">
      <ChartFrame
        title="Asset distribution"
        description="Registered assets by equipment type"
        data={assetData}
        unit="assets"
      >
        {assetData.length <= 5 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={assetData}
                dataKey="value"
                nameKey="name"
                innerRadius="52%"
                outerRadius="78%"
                paddingAngle={3}
                isAnimationActive={false}
              >
                {assetData.map((item, index) => (
                  <Cell fill={chartColors[index % chartColors.length]} key={item.name} />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltip unit="assets" />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={assetData} layout="vertical" margin={{ left: 12, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={90} />
              <Tooltip content={<ChartTooltip unit="assets" />} />
              <Bar dataKey="value" name="Assets" radius={[0, 5, 5, 0]} isAnimationActive={false}>
                {assetData.map((item, index) => (
                  <Cell fill={chartColors[index % chartColors.length]} key={item.name} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartFrame>

      <ChartFrame
        title="Inspection status"
        description="Current workload by resolution status"
        data={statusData}
        unit="inspections"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" interval={0} />
            <YAxis allowDecimals={false} width={38} />
            <Tooltip content={<ChartTooltip unit="inspections" />} />
            <Bar dataKey="value" name="Inspections" fill="var(--chart-2)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="RAM by department"
        description="Installed memory represented in gigabytes"
        data={ramData}
        unit="GB"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ramData} layout="vertical" margin={{ left: 12, right: 28 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" unit=" GB" allowDecimals={false} />
            <YAxis dataKey="name" type="category" width={100} />
            <Tooltip content={<ChartTooltip unit="GB" />} />
            <Bar dataKey="value" name="RAM" fill="var(--chart-3)" radius={[0, 5, 5, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Purchases vs repairs"
        description="Inspection activity by category"
        data={purchaseData}
        unit="inspections"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={purchaseData} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" interval={0} />
            <YAxis allowDecimals={false} width={38} />
            <Tooltip content={<ChartTooltip unit="inspections" />} />
            <Bar dataKey="value" name="Inspections" fill="var(--chart-4)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Inspection trend"
        description="Activity recorded over the selected period"
        data={trendData}
        unit="inspections"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 12, right: 18, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" minTickGap={22} />
            <YAxis allowDecimals={false} width={38} />
            <Tooltip content={<ChartTooltip unit="inspections" />} />
            <Line
              type="monotone"
              dataKey="value"
              name="Inspections"
              stroke="var(--chart-1)"
              strokeWidth={3}
              dot={{ r: 4, fill: 'var(--chart-1)' }}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="Technician workload"
        description="Assignments distributed across technical personnel"
        data={workloadData}
        unit="assignments"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={workloadData} margin={{ top: 12, right: 18, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" interval={0} />
            <YAxis allowDecimals={false} width={38} />
            <Tooltip content={<ChartTooltip unit="assignments" />} />
            <Bar dataKey="value" name="Assignments" fill="var(--chart-5)" radius={[5, 5, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <div className="report-insight panel">
        <span aria-hidden="true"><ChartNoAxesCombined size={24} /></span>
        <div>
          <p className="eyebrow">Reading this report</p>
          <h2>Every chart includes a text and table alternative</h2>
          <p>Use the data table beneath each visual for exact values and keyboard-accessible review.</p>
        </div>
        <TrendingUp size={22} aria-hidden="true" />
        <Database size={22} aria-hidden="true" />
      </div>
    </div>
  )
}
