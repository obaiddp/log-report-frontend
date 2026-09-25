import {
  CalendarRange,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSupportOptions } from '../hooks/useSupportOptions'
import { useToast } from '../hooks/useToast'
import { ReportVisuals } from '../components/report/ReportVisuals'
import { Button, FormField, PageHeader, Panel, SectionHeading } from '../components/ui'
import { downloadCsv, get, getErrorMessage, shouldIgnoreRequest } from '../lib/api'
import { supportPriorityOptions, supportStatusOptions } from '../lib/constants'
import { startOfMonthIso, todayIso } from '../lib/format'
import { cleanQuery } from '../lib/support'
import type { ReportSummary } from '../types'

function filenameFromDisposition(disposition?: string): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  const basic = disposition?.match(/filename="?([^";]+)"?/i)?.[1]
  const filename = encoded ? decodeURIComponent(encoded) : basic
  return filename || `support-log-report-${todayIso()}.csv`
}

export default function ReportsPage() {
  const { notify } = useToast()
  const options = useSupportOptions()
  const [dateFrom, setDateFrom] = useState(startOfMonthIso())
  const [dateTo, setDateTo] = useState(todayIso())
  const [departmentId, setDepartmentId] = useState('')
  const [issueTypeId, setIssueTypeId] = useState('')
  const [itemTypeId, setItemTypeId] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [initiatedBy, setInitiatedBy] = useState('')
  const [ticketNumber, setTicketNumber] = useState('')
  const [search, setSearch] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [summary, setSummary] = useState<ReportSummary>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const dateError = dateFrom && dateTo && dateFrom > dateTo ? 'The start date must be on or before the end date.' : ''
  const params = useMemo(() => cleanQuery({
    date_from: dateFrom,
    date_to: dateTo,
    department_id: departmentId,
    issue_type_id: issueTypeId,
    item_type_id: itemTypeId,
    status,
    priority,
    assigned_to: assignedTo,
    initiated_by: initiatedBy,
    ticket_number: ticketNumber,
    search: search || undefined,
  }), [assignedTo, dateFrom, dateTo, departmentId, initiatedBy, issueTypeId, itemTypeId, priority, search, status, ticketNumber])

  const loadReports = useCallback(async (signal?: AbortSignal) => {
    if (dateError) { setError('Choose a valid date range before loading reports.'); setLoading(false); return }
    setLoading(true); setError('')
    const endpoints = [
      get<unknown>('/v1/reports/by-department', { params, signal }),
      get<unknown>('/v1/reports/by-resource', { params, signal }),
      get<unknown>('/v1/reports/by-issue-type', { params, signal }),
      get<unknown>('/v1/reports/by-status', { params, signal }),
    ]
    const results = await Promise.allSettled(endpoints)
    if (signal?.aborted) return
    const [departments, resources, issueTypes, statuses] = results
    const nextSummary: ReportSummary = {}
    if (departments.status === 'fulfilled') nextSummary.department_breakdown = departments.value
    if (resources.status === 'fulfilled') nextSummary.resource_breakdown = resources.value
    if (issueTypes.status === 'fulfilled') nextSummary.issue_type_breakdown = issueTypes.value
    if (statuses.status === 'fulfilled') nextSummary.status_breakdown = statuses.value
    setSummary(nextSummary)
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected')
    if (failure) setError(getErrorMessage(failure.reason))
    setLoading(false)
  }, [dateError, params])

  useEffect(() => { const controller = new AbortController(); void loadReports(controller.signal).catch((requestError: unknown) => { if (!shouldIgnoreRequest(requestError) && !controller.signal.aborted) { setError(getErrorMessage(requestError)); setLoading(false) } }); return () => controller.abort() }, [loadReports, reloadKey])

  const clearFilters = () => { setSearch(''); setDepartmentId(''); setIssueTypeId(''); setItemTypeId(''); setStatus(''); setPriority(''); setAssignedTo(''); setInitiatedBy(''); setTicketNumber(''); setDateFrom(startOfMonthIso()); setDateTo(todayIso()) }
  const hasFilters = Boolean(search || departmentId || issueTypeId || itemTypeId || status || priority || assignedTo || initiatedBy || ticketNumber || dateFrom !== startOfMonthIso() || dateTo !== todayIso())
  const exportCsv = async () => {
    if (dateError) return
    setExporting(true)
    try { const response = await downloadCsv(params); const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = filenameFromDisposition(response.headers['content-disposition'] as string | undefined); document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); notify('CSV report downloaded.') }
    catch (requestError: unknown) { notify(getErrorMessage(requestError), 'error') }
    finally { setExporting(false) }
  }

  return <div className="page-stack">
    <PageHeader eyebrow="Reporting" title="Support reports" description="Understand demand by department, assigned resource, issue type, item, and status." actions={<Button onClick={() => void exportCsv()} loading={exporting} disabled={loading || Boolean(dateError)}><Download size={18} aria-hidden="true" />Export CSV</Button>} />
    <Panel className="report-controls"><div className="report-controls__top"><div><p className="control-label">Report filters</p><div className="report-filter-summary"><CalendarRange size={18} aria-hidden="true" /><span>{dateFrom || 'Any date'} – {dateTo || 'Any date'}</span></div></div>{hasFilters && <Button variant="ghost" size="small" onClick={clearFilters}><X size={17} aria-hidden="true" />Reset filters</Button>}<Button variant="ghost" size="small" onClick={() => setReloadKey((value) => value + 1)} disabled={loading}><RefreshCw size={17} aria-hidden="true" />Refresh</Button></div><div className="filter-grid report-filter-grid"><div className="filter-field filter-field--search"><label htmlFor="report-search">Search</label><div className="input-with-icon"><Search size={18} aria-hidden="true" /><input id="report-search" type="search" value={search} placeholder="Ticket, description, requester…" onChange={(event) => setSearch(event.target.value)} /></div></div><FormField label="From date" required error={dateError} inputId="report-from">{(fieldProps) => <input {...fieldProps} type="date" max={dateTo || todayIso()} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />}</FormField><FormField label="To date" required error={dateError} inputId="report-to">{(fieldProps) => <input {...fieldProps} type="date" min={dateFrom || undefined} max={todayIso()} value={dateTo} onChange={(event) => setDateTo(event.target.value)} />}</FormField><div className="filter-field"><label htmlFor="report-department">Department</label><select id="report-department" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">All departments</option>{options.departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select></div><div className="filter-field"><label htmlFor="report-issue-type">Issue type</label><select id="report-issue-type" value={issueTypeId} onChange={(event) => setIssueTypeId(event.target.value)}><option value="">All issue types</option>{options.issueTypes.map((issueType) => <option value={issueType.id} key={issueType.id}>{issueType.name}</option>)}</select></div><div className="filter-field"><label htmlFor="report-item-type">Item type</label><select id="report-item-type" value={itemTypeId} onChange={(event) => setItemTypeId(event.target.value)}><option value="">All item types</option>{options.itemTypes.map((itemType) => <option value={itemType.id} key={itemType.id}>{itemType.name}</option>)}</select></div><div className="filter-field"><label htmlFor="report-status">Status</label><select id="report-status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{supportStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div><div className="filter-field"><label htmlFor="report-priority">Priority</label><select id="report-priority" value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">All priorities</option>{supportPriorityOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div><div className="filter-field"><label htmlFor="report-resource">Assigned resource</label><select id="report-resource" value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)}><option value="">All resources</option>{options.users.filter((candidate) => candidate.role === 'technical_resource' || candidate.role === 'admin').map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}</select></div><div className="filter-field"><label htmlFor="report-initiator">Initiator name</label><input id="report-initiator" value={initiatedBy} placeholder="Search by requester name" onChange={(event) => setInitiatedBy(event.target.value)} /></div><div className="filter-field"><label htmlFor="report-ticket">Ticket number</label><input id="report-ticket" value={ticketNumber} placeholder="e.g. IT-000123" onChange={(event) => setTicketNumber(event.target.value)} /></div></div></Panel>
    <section aria-labelledby="report-visuals-title"><SectionHeading title="Visual analysis" description="Each visual includes an exact-value data table alternative for keyboard-accessible review." /><div id="report-visuals-title"><ReportVisuals summary={summary} loading={loading} error={error} onRetry={() => void loadReports()} /></div></section>
    <Panel className="export-callout"><span aria-hidden="true"><FileSpreadsheet size={25} /></span><div><h2>Need the underlying records?</h2><p>CSV export uses the same date and filter values shown above.</p></div><Button variant="secondary" onClick={() => void exportCsv()} loading={exporting} disabled={loading || Boolean(dateError)}><Download size={18} aria-hidden="true" />Download CSV</Button></Panel>
  </div>
}
