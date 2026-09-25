import { BarChart3, ChartNoAxesCombined, Database, TrendingUp } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber, titleCase } from '../../lib/format'
import { normalizeChartData, type ChartDatum } from '../../lib/support'
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

function totalOf(data: ChartDatum[]): number {
  return data.reduce((total, item) => total + item.value, 0)
}

function accessibleSummary(title: string, data: ChartDatum[], unit = 'records'): string {
  if (data.length === 0) return `${title}: no data available.`
  const total = totalOf(data)
  const highest = data.reduce((current, item) => (item.value > current.value ? item : current))
  return `${title}: ${formatNumber(total)} ${unit} across ${data.length} categories. ${titleCase(highest.name)} is highest at ${formatNumber(highest.value)}.`
}

export function ReportChartFrame({
  title,
  description,
  data,
  children,
  unit = 'records',
}: {
  title: string
  description: string
  data: ChartDatum[]
  children: ReactNode
  unit?: string
}) {
  const detailsId = useId().replace(/:/g, '')
  return (
    <article className="panel chart-card">
      <div className="chart-card__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <BarChart3 size={21} aria-hidden="true" />
      </div>
      {data.length === 0 ? (
        <EmptyState title="No chart data" message="No records match the selected filters." />
      ) : (
        <>
          <div className="chart-container" role="img" aria-label={accessibleSummary(title, data, unit)}>
            {children}
          </div>
          <details className="data-alternative" aria-labelledby={detailsId}>
            <summary id={detailsId}>View accessible data table</summary>
            <div className="table-scroll">
              <table>
                <caption className="sr-only">{title} data</caption>
                <thead>
                  <tr><th scope="col">Category</th><th scope="col">Count</th></tr>
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
}: {
  active?: boolean
  payload?: Array<{ value?: number | string; name?: string }>
  label?: string | number
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <strong>{titleCase(String(label || payload[0].name || 'Total'))}</strong>
      <span>{formatNumber(payload[0].value)} records</span>
    </div>
  )
}

function BarVisual({ data, color, horizontal = false }: { data: ChartDatum[]; color: string; horizontal?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 12, right: 18, left: horizontal ? 8 : 0, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="name" width={100} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" interval={0} minTickGap={12} />
            <YAxis allowDecimals={false} width={38} />
          </>
        )}
        <Tooltip content={<ChartTooltip />} />
        <Bar dataKey="value" name="Records" fill={color} radius={horizontal ? [0, 5, 5, 0] : [5, 5, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
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
      <div className="charts-grid" aria-label="Loading support charts">
        {[0, 1, 2, 3].map((item) => (
          <div className="panel chart-card" key={item}>
            <div className="chart-card__header">
              <div><h2>Loading chart</h2><p>Preparing support reporting data</p></div>
            </div>
            <Skeleton count={3} />
          </div>
        ))}
      </div>
    )
  }

  if (error) return <ErrorState message={error} onRetry={onRetry} />

  const statusData = normalizeChartData(
    summary.status_breakdown ?? summary.by_status ?? summary.statuses,
    ['status', 'status_name', 'name', 'label'],
    ['count', 'total', 'value', 'logs'],
  )
  const priorityData = normalizeChartData(
    summary.priority_breakdown ?? summary.by_priority ?? summary.priorities,
    ['priority', 'priority_name', 'name', 'label'],
    ['count', 'total', 'value', 'logs'],
  )
  const issueTypeData = normalizeChartData(
    summary.issue_type_breakdown ?? summary.issue_types_breakdown ?? summary.issue_breakdown,
    ['issue_type', 'issue_type_name', 'issue_types', 'name', 'label'],
    ['count', 'total', 'value', 'logs'],
  )
  const itemData = normalizeChartData(
    summary.item_breakdown ?? summary.items_breakdown,
    ['item_type', 'item_type_name', 'name', 'label'],
    ['count', 'total', 'value', 'logs'],
  )
  const resourceData = normalizeChartData(
    summary.resource_breakdown ?? summary.assigned_resource_breakdown ?? summary.resources,
    ['resource', 'resource_name', 'assigned_resource', 'name', 'label'],
    ['count', 'total', 'value', 'logs', 'assignments'],
  )
  const departmentData = normalizeChartData(
    summary.department_breakdown ?? summary.by_department ?? summary.departments,
    ['department', 'department_name', 'name', 'label'],
    ['count', 'total', 'value', 'logs'],
  )

  return (
    <div className="charts-grid">
      <ReportChartFrame title="Logs by status" description="Current resolution stage" data={statusData}>
        <BarVisual data={statusData} color="var(--chart-1)" />
      </ReportChartFrame>
      {priorityData.length > 0 && (
        <ReportChartFrame title="Logs by priority" description="Work requiring attention" data={priorityData}>
          <BarVisual data={priorityData} color="var(--chart-2)" />
        </ReportChartFrame>
      )}
      <ReportChartFrame title="Logs by issue type" description="Demand grouped by issue category" data={issueTypeData}>
        {issueTypeData.length <= 6 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={issueTypeData} dataKey="value" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={3} isAnimationActive={false}>
                {issueTypeData.map((item, index) => <Cell fill={chartColors[index % chartColors.length]} key={item.name} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <BarVisual data={issueTypeData} color="var(--chart-3)" horizontal />
        )}
      </ReportChartFrame>
      {itemData.length > 0 && (
        <ReportChartFrame title="Logs by item" description="Support demand by item category" data={itemData}>
          <BarVisual data={itemData} color="var(--chart-6)" horizontal />
        </ReportChartFrame>
      )}
      {resourceData.length > 0 && (
        <ReportChartFrame title="Assigned resource workload" description="Assignments currently visible to this workspace" data={resourceData}>
          <BarVisual data={resourceData} color="var(--chart-4)" horizontal />
        </ReportChartFrame>
      )}
      {departmentData.length > 0 && (
        <ReportChartFrame title="Logs by department" description="Support demand across organizational teams" data={departmentData}>
          <BarVisual data={departmentData} color="var(--chart-5)" horizontal />
        </ReportChartFrame>
      )}
      <div className="report-insight panel">
        <span aria-hidden="true"><ChartNoAxesCombined size={24} /></span>
        <div>
          <p className="eyebrow">Reading these reports</p>
          <h2>Every chart includes a text and table alternative</h2>
          <p>Use the data table beneath each visual for exact values and keyboard-accessible review.</p>
        </div>
        <TrendingUp size={22} aria-hidden="true" />
        <Database size={22} aria-hidden="true" />
      </div>
    </div>
  )
}
