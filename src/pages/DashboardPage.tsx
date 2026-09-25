import {
  Activity,
  CalendarRange,
  CheckCircle2,
  Clock3,
  FilePlus2,
  ListTodo,
  RefreshCw,
  TriangleAlert,
  ArrowRight,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReportVisuals } from '../components/report/ReportVisuals'
import {
  Button,
  MetricCard,
  PageHeader,
  Panel,
  PriorityBadge,
  SectionHeading,
  StatusBadge,
  EmptyState,
  Skeleton,
} from '../components/ui'
import { get, getErrorMessage, shouldIgnoreRequest } from '../lib/api'
import { formatDate, formatNumber, startOfMonthIso, startOfWeekIso, todayIso } from '../lib/format'
import { dashboardMetrics, departmentName, listData, referenceName, unwrapResource, userName } from '../lib/support'
import type { Paginated, SupportDashboardSummary, SupportLog } from '../types'

function summaryPayload(value: unknown): SupportDashboardSummary {
  const resource = unwrapResource(value as SupportDashboardSummary | { data: SupportDashboardSummary })
  return resource && typeof resource === 'object' ? resource : {}
}

export default function DashboardPage() {
  const [dateFrom, setDateFrom] = useState(startOfMonthIso())
  const [dateTo, setDateTo] = useState(todayIso())
  const [appliedRange, setAppliedRange] = useState({ from: startOfMonthIso(), to: todayIso() })
  const [summary, setSummary] = useState<SupportDashboardSummary>({})
  const [recentLogs, setRecentLogs] = useState<SupportLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const dateError = dateFrom && dateTo && dateFrom > dateTo
    ? 'The start date must be on or before the end date.'
    : ''

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    if (dateError) {
      setError('Choose a valid date range before loading the dashboard.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    const params = {
      date_from: appliedRange.from || undefined,
      date_to: appliedRange.to || undefined,
    }
    const [summaryResult, logsResult] = await Promise.allSettled([
      get<unknown>('/v1/dashboard/summary', { params, signal }),
      get<Paginated<SupportLog>>('/v1/support-logs', {
        params: {
          ...params,
          per_page: 8,
          page: 1,
          sort_by: 'updated_at',
          sort_direction: 'desc',
        },
        signal,
      }),
    ])
    if (signal?.aborted) return
    if (summaryResult.status === 'fulfilled') setSummary(summaryPayload(summaryResult.value))
    else setError(getErrorMessage(summaryResult.reason))
    if (logsResult.status === 'fulfilled') {
      const response = logsResult.value
      setRecentLogs(listData(response))
      // The dashboard intentionally renders a compact workload list.
    }
    setLoading(false)
  }, [appliedRange.from, appliedRange.to, dateError])

  useEffect(() => {
    const controller = new AbortController()
    void loadDashboard(controller.signal).catch((requestError: unknown) => {
      if (!shouldIgnoreRequest(requestError) && !controller.signal.aborted) {
        setError(getErrorMessage(requestError))
        setLoading(false)
      }
    })
    return () => controller.abort()
  }, [loadDashboard, reloadKey])

  const applyRange = () => {
    if (!dateError) setAppliedRange({ from: dateFrom, to: dateTo })
  }

  const applyPreset = (from: string) => {
    const to = todayIso()
    setDateFrom(from)
    setDateTo(to)
    setAppliedRange({ from, to })
  }

  const metrics = dashboardMetrics(summary)
  const activeLogs = recentLogs.filter((log) => !['resolved', 'closed', 'cancelled'].includes(String(log.status)))

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operations overview"
        title="Support desk dashboard"
        description="A clear view of incoming work, active assignments, and resolution progress."
        actions={
          <Link className="button button--primary button--default" to="/support-logs/new">
            <FilePlus2 size={18} aria-hidden="true" />
            Create support log
          </Link>
        }
      />

      <Panel className="dashboard-controls dashboard-controls--wrap">
        <div className="control-field">
          <label htmlFor="dashboard-from">From</label>
          <div className="input-with-icon">
            <CalendarRange size={18} aria-hidden="true" />
            <input id="dashboard-from" type="date" max={dateTo || todayIso()} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </div>
        </div>
        <div className="control-field">
          <label htmlFor="dashboard-to">To</label>
          <div className="input-with-icon">
            <CalendarRange size={18} aria-hidden="true" />
            <input id="dashboard-to" type="date" min={dateFrom || undefined} max={todayIso()} value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>
        </div>
        <div className="dashboard-controls__presets" aria-label="Quick date ranges">
          <Button variant="ghost" size="small" onClick={() => applyPreset(todayIso())} disabled={loading}>Today</Button>
          <Button variant="ghost" size="small" onClick={() => applyPreset(startOfWeekIso())} disabled={loading}>This week</Button>
          <Button variant="ghost" size="small" onClick={() => applyPreset(startOfMonthIso())} disabled={loading}>This month</Button>
        </div>
        <div className="dashboard-controls__actions">
          <Button variant="secondary" onClick={applyRange} disabled={loading || Boolean(dateError)}>Apply range</Button>
          <Button variant="ghost" size="small" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}>
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </Button>
        </div>
        {dateError && <p className="control-error" role="alert">{dateError}</p>}
        <div className="dashboard-controls__status">
          <span className={loading ? 'status-dot status-dot--loading' : 'status-dot'} aria-hidden="true" />
          <span>{loading ? 'Refreshing' : `${formatDate(appliedRange.from)} – ${formatDate(appliedRange.to)}`}</span>
        </div>
      </Panel>

      <section aria-labelledby="dashboard-metrics-title">
        <SectionHeading title="Key metrics" description="Totals reflect the selected date range." />
        <div className="metric-grid" id="dashboard-metrics-title">
          <MetricCard label="Total logs" value={loading || error ? '—' : formatNumber(metrics.total)} hint="Support requests in range" icon={<Activity size={22} />} tone="blue" />
          <MetricCard label="Open work" value={loading || error ? '—' : formatNumber(metrics.open)} hint="Awaiting progress" icon={<ListTodo size={22} />} tone="amber" />
          <MetricCard label="In progress" value={loading || error ? '—' : formatNumber(metrics.inProgress)} hint="Currently being worked" icon={<Clock3 size={22} />} tone="violet" />
          <MetricCard label="Indoor repair" value={loading || error ? '—' : formatNumber(metrics.indoorRepair)} hint="In-house repair work" icon={<TriangleAlert size={22} />} tone="amber" />
          <MetricCard label="Outdoor repair" value={loading || error ? '—' : formatNumber(metrics.outdoorRepair)} hint="External repair work" icon={<TriangleAlert size={22} />} tone="violet" />
          <MetricCard label="Resolved" value={loading || error ? '—' : formatNumber(metrics.resolved)} hint="Resolved requests" icon={<CheckCircle2 size={22} />} tone="green" />
          <MetricCard label="Closed" value={loading || error ? '—' : formatNumber(metrics.closed)} hint="Closed records" icon={<CheckCircle2 size={22} />} tone="blue" />
          <MetricCard label="Overdue" value={loading || error ? '—' : formatNumber(metrics.overdue)} hint="Active beyond 7 days" icon={<TriangleAlert size={22} />} tone="amber" />
          <MetricCard label="Created today" value={loading || error ? '—' : formatNumber(metrics.createdToday)} hint="New records today" icon={<CalendarRange size={22} />} tone="blue" />
          <MetricCard label="Created this week" value={loading || error ? '—' : formatNumber(metrics.createdThisWeek)} hint="New records this week" icon={<ListTodo size={22} />} tone="violet" />
          <MetricCard label="Avg resolution" value={loading || error ? '—' : metrics.averageResolutionHours === null ? '—' : `${formatNumber(metrics.averageResolutionHours)} h`} hint="Created to resolved" icon={<Clock3 size={22} />} tone="green" />
        </div>
      </section>

      <section aria-labelledby="dashboard-visuals-title">
        <SectionHeading title="Support analytics" description="Use the chart legends, tooltips, or data tables to review exact values." />
        <div id="dashboard-visuals-title">
          <ReportVisuals summary={summary} loading={loading} error={error} onRetry={() => void loadDashboard()} />
        </div>
      </section>

      <section aria-labelledby="dashboard-workload-title">
        <SectionHeading title="Recent active work" description="The latest requests that still need attention." action={<Link className="text-link" to="/support-logs">View all logs</Link>} />
        <div id="dashboard-workload-title">
          {loading ? (
            <Skeleton count={4} />
          ) : recentLogs.length === 0 ? (
            <EmptyState title="No support logs yet" message="Create the first support request to start tracking work." action={<Link className="button button--primary button--default" to="/support-logs/new">Create support log</Link>} />
          ) : (
            <Panel className="table-card dashboard-workload">
              <div className="table-scroll">
                <table className="data-table">
                  <caption className="sr-only">Recent active support logs</caption>
                  <thead><tr><th scope="col">Ticket</th><th scope="col">Department</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Assigned resource</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead>
                  <tbody>
                    {(activeLogs.length > 0 ? activeLogs : recentLogs).map((log) => (
                      <tr key={log.id}>
                        <td><div className="entity-cell"><span className="entity-cell__icon"><ListTodo size={19} aria-hidden="true" /></span><span><strong>{log.ticket_number}</strong><small>{formatDate(log.issue_date)}</small></span></div></td>
                        <td>{departmentName(log.department)}</td>
                        <td><PriorityBadge value={log.priority} /></td>
                        <td><StatusBadge value={log.status} /></td>
                        <td>{referenceName(log.assigned_resource, '') || userName(log.assigned_to)}</td>
                        <td><Link className="icon-button" to={`/support-logs/${log.id}`} aria-label={`Open ${log.ticket_number}`} title="Open support log"><ArrowRight size={18} aria-hidden="true" /></Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      </section>

      {metrics.critical > 0 && (
        <div className="notice-banner" role="status">
          <TriangleAlert size={20} aria-hidden="true" />
          <div><strong>Critical work needs attention</strong><p>{formatNumber(metrics.critical)} critical-priority logs are included in this range.</p></div>
          <Link className="button button--secondary button--small" to="/support-logs?priority=critical">Review critical logs</Link>
        </div>
      )}
    </div>
  )
}
