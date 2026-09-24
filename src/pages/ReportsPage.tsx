import {
  Boxes,
  CalendarRange,
  ClipboardCheck,
  Clock3,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Wrench,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReportVisuals } from '../components/report/ReportVisuals'
import { useToast } from '../hooks/useToast'
import {
  Button,
  FormField,
  MetricCard,
  PageHeader,
  Panel,
  SectionHeading,
} from '../components/ui'
import { downloadCsv, get, getErrorMessage, shouldIgnoreRequest } from '../lib/api'
import { formatDate, formatNumber, startOfWeekIso, todayIso } from '../lib/format'
import { reportMetrics } from '../lib/reportMetrics'
import type { ReportSummary } from '../types'

type ReportRange = 'daily' | 'weekly' | 'custom'

function filenameFromDisposition(disposition?: string): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const basic = disposition?.match(/filename="?([^";]+)"?/i)?.[1]
  const filename = encoded ? decodeURIComponent(encoded) : basic
  return filename || `asset-inspection-report-${todayIso()}.csv`
}

export default function ReportsPage() {
  const { notify } = useToast()
  const [range, setRange] = useState<ReportRange>('daily')
  const [date, setDate] = useState(todayIso())
  const [from, setFrom] = useState(startOfWeekIso())
  const [to, setTo] = useState(todayIso())
  const [summary, setSummary] = useState<ReportSummary>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const params = useMemo(() => {
    if (range === 'daily') return { range, date }
    if (range === 'weekly') return { range }
    return { date_from: from, date_to: to }
  }, [date, from, range, to])

  const dateError =
    range === 'custom' && from && to && from > to
      ? 'The start date must be on or before the end date.'
      : ''

  const loadReport = useCallback(async (signal?: AbortSignal) => {
    setSummary({})
    if (range === 'custom' && from && to && from > to) {
      setError('Choose a valid custom date range before loading the report.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const report = await get<ReportSummary>('/v1/reports/summary', { params, signal })
      setSummary(report)
    } catch (requestError) {
      if (!shouldIgnoreRequest(requestError)) setError(getErrorMessage(requestError))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [from, params, range, to])

  useEffect(() => {
    const controller = new AbortController()
    void loadReport(controller.signal)
    return () => controller.abort()
  }, [loadReport, reloadKey])

  const handleExport = async () => {
    if (dateError) return
    setExporting(true)
    try {
      const response = await downloadCsv(params)
      const blobUrl = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filenameFromDisposition(response.headers['content-disposition'] as string | undefined)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
      notify('CSV report downloaded.')
    } catch (requestError) {
      notify(getErrorMessage(requestError), 'error')
    } finally {
      setExporting(false)
    }
  }

  const metrics = reportMetrics(summary)
  const periodLabel =
    range === 'daily'
      ? formatDate(date)
      : range === 'weekly'
        ? 'Current week'
        : `${formatDate(from)} – ${formatDate(to)}`

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Reporting"
        title="Inspection reports"
        description="Compare operational activity by day, week, or a custom date range."
        actions={
          <Button onClick={() => void handleExport()} loading={exporting} disabled={loading || Boolean(dateError)}>
            <Download size={18} aria-hidden="true" />
            Export CSV
          </Button>
        }
      />

      <Panel className="report-controls">
        <div className="report-controls__top">
          <div>
            <p className="control-label">Report period</p>
            <div className="segmented-control" role="group" aria-label="Report period">
              {([
                ['daily', 'Daily'],
                ['weekly', 'Weekly'],
                ['custom', 'Custom'],
              ] as const).map(([value, label]) => (
                <button
                  type="button"
                  className={range === value ? 'active' : ''}
                  aria-pressed={range === value}
                  key={value}
                  onClick={() => setRange(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="report-controls__period">
            <CalendarRange size={18} aria-hidden="true" />
            <span><small>Active period</small><strong>{periodLabel}</strong></span>
          </div>
          <Button variant="ghost" size="small" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}>
            <RefreshCw size={17} aria-hidden="true" />
            Refresh
          </Button>
        </div>

        <div className="report-controls__dates">
          {range === 'daily' && (
            <FormField label="Report date" inputId="report-date" error={dateError}>
              {(fieldProps) => <input {...fieldProps} type="date" max={todayIso()} value={date} onChange={(event) => setDate(event.target.value)} />}
            </FormField>
          )}
          {range === 'custom' && (
            <>
              <FormField label="From date" required inputId="report-from">
                {(fieldProps) => <input {...fieldProps} type="date" max={to || todayIso()} value={from} onChange={(event) => setFrom(event.target.value)} />}
              </FormField>
              <FormField label="To date" required error={dateError} inputId="report-to">
                {(fieldProps) => <input {...fieldProps} type="date" min={from || undefined} max={todayIso()} value={to} onChange={(event) => setTo(event.target.value)} />}
              </FormField>
            </>
          )}
          {range === 'weekly' && (
            <p className="report-controls__note">Weekly reports use the backend's current calendar week.</p>
          )}
        </div>
      </Panel>

      <section aria-labelledby="report-metrics-title">
        <SectionHeading title="Report summary" description={`Metrics for ${periodLabel.toLowerCase()}`} />
        <div className="metric-grid" id="report-metrics-title">
          <MetricCard label="Total assets" value={loading || error ? '—' : formatNumber(metrics.totalAssets)} hint="Portfolio total" icon={<Boxes size={22} />} tone="blue" />
          <MetricCard label="Inspections" value={loading || error ? '—' : formatNumber(metrics.totalInspections)} hint="Records in period" icon={<ClipboardCheck size={22} />} tone="violet" />
          <MetricCard label="Repairs" value={loading || error ? '—' : formatNumber(metrics.repairs)} hint="Repair-category activity" icon={<Wrench size={22} />} tone="amber" />
          <MetricCard label="Pending" value={loading || error ? '—' : formatNumber(metrics.pending)} hint="Awaiting resolution" icon={<Clock3 size={22} />} tone="green" />
        </div>
      </section>

      <section aria-labelledby="report-visuals-title">
        <SectionHeading title="Visual analysis" description="Each visual includes an exact-value data table alternative." />
        <div id="report-visuals-title">
          <ReportVisuals summary={summary} loading={loading} error={error} onRetry={() => void loadReport()} />
        </div>
      </section>

      <Panel className="export-callout">
        <span aria-hidden="true"><FileSpreadsheet size={25} /></span>
        <div><h2>Need the underlying records?</h2><p>The CSV export uses the active report filters and date period.</p></div>
        <Button variant="secondary" onClick={() => void handleExport()} loading={exporting} disabled={loading || Boolean(dateError)}>
          <Download size={18} aria-hidden="true" />
          Download CSV
        </Button>
      </Panel>
    </div>
  )
}
