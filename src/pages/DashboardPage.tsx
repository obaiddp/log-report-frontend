import {
  Boxes,
  CalendarCheck2,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  PackageCheck,
  RefreshCw,
  Wrench,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ReportVisuals } from '../components/report/ReportVisuals'
import {
  Button,
  MetricCard,
  PageHeader,
  Panel,
  SectionHeading,
} from '../components/ui'
import { get, getErrorMessage, shouldIgnoreRequest } from '../lib/api'
import { formatDate, formatNumber, todayIso } from '../lib/format'
import { reportMetrics } from '../lib/reportMetrics'
import type { ReportSummary } from '../types'

type Range = 'daily' | 'weekly'

export default function DashboardPage() {
  const [range, setRange] = useState<Range>('daily')
  const [date, setDate] = useState(todayIso())
  const [summary, setSummary] = useState<ReportSummary>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadReport = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    setSummary({})
    try {
      const data = await get<ReportSummary>('/v1/reports/summary', {
        params: range === 'daily' ? { range, date } : { range },
        signal,
      })
      setSummary(data)
    } catch (requestError) {
      if (!shouldIgnoreRequest(requestError)) setError(getErrorMessage(requestError))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [date, range])

  useEffect(() => {
    const controller = new AbortController()
    void loadReport(controller.signal)
    return () => controller.abort()
  }, [loadReport])

  const metrics = reportMetrics(summary)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Operations overview"
        title="Asset health dashboard"
        description="Monitor the asset register, inspection workload, and department capacity."
        actions={
          <Link className="button button--primary button--default" to="/inspection-form">
            <FilePlus2 size={18} aria-hidden="true" />
            New inspection
          </Link>
        }
      />

      <Panel className="dashboard-controls">
        <div>
          <p className="control-label">Reporting period</p>
          <div className="segmented-control" role="group" aria-label="Dashboard reporting period">
            <button
              type="button"
              className={range === 'daily' ? 'active' : ''}
              aria-pressed={range === 'daily'}
              onClick={() => setRange('daily')}
            >
              Daily
            </button>
            <button
              type="button"
              className={range === 'weekly' ? 'active' : ''}
              aria-pressed={range === 'weekly'}
              onClick={() => setRange('weekly')}
            >
              Weekly
            </button>
          </div>
        </div>
        {range === 'daily' && (
          <div className="control-field">
            <label htmlFor="dashboard-date">Report date</label>
            <input
              id="dashboard-date"
              type="date"
              value={date}
              max={todayIso()}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
        )}
        <div className="dashboard-controls__status">
          <span className={loading ? 'status-dot status-dot--loading' : 'status-dot'} aria-hidden="true" />
          <span>{loading ? 'Refreshing' : `Updated ${formatDate(date)}`}</span>
        </div>
        <Button variant="ghost" size="small" onClick={() => void loadReport()} disabled={loading}>
          <RefreshCw size={17} aria-hidden="true" />
          Refresh
        </Button>
      </Panel>

      <section aria-labelledby="metrics-title">
        <SectionHeading
          title="Key metrics"
          description={range === 'daily' ? `Activity for ${formatDate(date)}` : 'Current week activity'}
        />
        <div className="metric-grid" id="metrics-title">
          <MetricCard
            label="Total assets"
            value={loading || error ? '—' : formatNumber(metrics.totalAssets)}
            hint="Registered records"
            icon={<Boxes size={22} />}
            tone="blue"
          />
          <MetricCard
            label="Inspections"
            value={loading || error ? '—' : formatNumber(metrics.totalInspections)}
            hint={range === 'daily' ? 'Recorded today' : 'Recorded this week'}
            icon={<ClipboardCheck size={22} />}
            tone="violet"
          />
          <MetricCard
            label="Repair activity"
            value={loading || error ? '—' : formatNumber(metrics.repairs)}
            hint="Repair-category records"
            icon={<Wrench size={22} />}
            tone="amber"
          />
          <MetricCard
            label="Pending work"
            value={loading || error ? '—' : formatNumber(metrics.pending)}
            hint="Awaiting resolution"
            icon={<Clock3 size={22} />}
            tone="green"
          />
        </div>
      </section>

      <section aria-labelledby="dashboard-visuals-title">
        <SectionHeading
          title="Operational analytics"
          description="Use the chart legends, tooltips, or data tables to review exact values."
        />
        <div id="dashboard-visuals-title">
          <ReportVisuals
            summary={summary}
            loading={loading}
            error={error}
            onRetry={() => void loadReport()}
          />
        </div>
      </section>

      <section aria-labelledby="quick-actions-title">
        <Panel className="quick-actions">
          <div className="quick-actions__intro">
            <span className="quick-actions__icon" aria-hidden="true"><PackageCheck size={24} /></span>
            <div>
              <p className="eyebrow">Common workflows</p>
              <h2 id="quick-actions-title">Keep the register current</h2>
            </div>
          </div>
          <div className="quick-actions__links">
            <Link to="/assets/new">
              <CalendarCheck2 size={19} aria-hidden="true" />
              <span><strong>Register an asset</strong><small>Add ownership and specifications</small></span>
            </Link>
            <Link to="/inspection-form">
              <ClipboardCheck size={19} aria-hidden="true" />
              <span><strong>Complete an inspection</strong><small>Record service and assignment</small></span>
            </Link>
            <Link to="/reports">
              <RefreshCw size={19} aria-hidden="true" />
              <span><strong>Open detailed reports</strong><small>Filter, review, and export</small></span>
            </Link>
          </div>
        </Panel>
      </section>
    </div>
  )
}
