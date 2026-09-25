import {
  CheckCircle2,
  ClipboardList,
  Filter,
  ListTodo,
  Search,
  TimerReset,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useSupportOptions } from '../hooks/useSupportOptions'
import {
  Button,
  EmptyState,
  ErrorState,
  MetricCard,
  PageHeader,
  Pagination,
  PriorityBadge,
  Skeleton,
  StatusBadge,
} from '../components/ui'
import { get, getErrorMessage, shouldIgnoreRequest } from '../lib/api'
import { supportStatusOptions } from '../lib/constants'
import { formatDate, formatNumber } from '../lib/format'
import { departmentName, issueTypeNames, listData, paginationFrom, userName } from '../lib/support'
import type { Paginated, SupportLog } from '../types'

export default function MyWorkPage() {
  const { user } = useAuth()
  const options = useSupportOptions()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [logs, setLogs] = useState<SupportLog[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const params = useMemo(() => ({
    assigned_to: user?.id,
    search: debouncedSearch || undefined,
    status: status || undefined,
    sort_by: 'updated_at',
    sort_direction: 'desc' as const,
    per_page: 15,
    page,
  }), [debouncedSearch, page, status, user?.id])

  const loadWork = useCallback(async (signal?: AbortSignal) => {
    if (!user?.id) return
    setLoading(true)
    setError('')
    try {
      const response = await get<Paginated<SupportLog>>('/v1/support-logs', { params, signal })
      setLogs(listData(response))
      setMeta(paginationFrom(response, page))
    } catch (requestError: unknown) {
      if (!shouldIgnoreRequest(requestError)) setError(getErrorMessage(requestError))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [page, params, user?.id])

  useEffect(() => {
    const controller = new AbortController()
    void loadWork(controller.signal)
    return () => controller.abort()
  }, [loadWork, reloadKey])

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setPage(1)
  }
  const openCount = logs.filter((log) => !['resolved', 'closed', 'cancelled'].includes(String(log.status))).length
  const doneCount = logs.filter((log) => ['resolved', 'closed'].includes(String(log.status))).length
  const hasFilters = Boolean(search || status)

  return (
    <div className="page-stack">
      <PageHeader eyebrow="Personal queue" title="My work" description={`Support requests currently assigned to ${user?.name || 'you'}.`} actions={<Link className="button button--primary button--default" to="/support-logs/new"><ClipboardList size={18} aria-hidden="true" />Create support log</Link>} />

      <div className="metric-grid">
        <MetricCard label="Assigned total" value={loading || error ? '—' : formatNumber(meta.total)} hint="All matching requests" icon={<ClipboardList size={22} />} tone="blue" />
        <MetricCard label="Active on this page" value={loading || error ? '—' : formatNumber(openCount)} hint="Needs progress" icon={<ListTodo size={22} />} tone="amber" />
        <MetricCard label="Completed on this page" value={loading || error ? '—' : formatNumber(doneCount)} hint="Resolved or closed" icon={<CheckCircle2 size={22} />} tone="green" />
        <MetricCard label="Current filter" value={status ? supportStatusOptions.find((option) => option.value === status)?.label || status : 'All statuses'} hint="Queue view" icon={<Filter size={22} />} tone="violet" />
      </div>

      <section className="filter-panel" aria-labelledby="my-work-filters-title">
        <div className="filter-panel__heading"><div><Filter size={19} aria-hidden="true" /><h2 id="my-work-filters-title">Filter my work</h2></div>{hasFilters && <Button variant="ghost" size="small" onClick={clearFilters}><X size={17} aria-hidden="true" />Reset</Button>}</div>
        <div className="filter-grid support-filter-grid support-filter-grid--compact">
          <div className="filter-field filter-field--search"><label htmlFor="my-work-search">Search</label><div className="input-with-icon"><Search size={18} aria-hidden="true" /><input id="my-work-search" type="search" value={search} placeholder="Ticket or description…" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></div></div>
          <div className="filter-field"><label htmlFor="my-work-status">Status</label><select id="my-work-status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }}><option value="">All statuses</option>{supportStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
        </div>
      </section>

      {loading ? <Skeleton count={6} /> : error ? <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : logs.length === 0 ? <EmptyState title="No assigned work found" message={hasFilters ? 'Try clearing the filters.' : 'Requests assigned to you will appear here.'} action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>Reset filters</Button> : undefined} /> : (
        <>
          <div className="table-card desktop-only"><div className="table-scroll"><table className="data-table"><caption className="sr-only">Support logs assigned to you</caption><thead><tr><th scope="col">Ticket</th><th scope="col">Department</th><th scope="col">Issue type</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Open</span></th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td><div className="entity-cell"><span className="entity-cell__icon"><ClipboardList size={19} aria-hidden="true" /></span><span><strong>{log.ticket_number}</strong><small>{userName(log.initiated_by)}</small></span></div></td><td>{departmentName(log.department, '—')}</td><td>{issueTypeNames(log.issue_types, options.issueTypes).join(', ') || '—'}</td><td><PriorityBadge value={log.priority} /></td><td><StatusBadge value={log.status} /></td><td>{formatDate(log.updated_at || log.issue_date)}</td><td><Link className="icon-button" to={`/support-logs/${log.id}`} aria-label={`Open ${log.ticket_number}`} title="Open support log"><TimerReset size={18} aria-hidden="true" /></Link></td></tr>)}</tbody></table></div></div>
          <div className="mobile-records mobile-only">{logs.map((log) => <article className="record-card" key={log.id}><div className="record-card__header"><div className="entity-cell"><span className="entity-cell__icon"><ClipboardList size={19} aria-hidden="true" /></span><span><strong>{log.ticket_number}</strong><small>{formatDate(log.issue_date)}</small></span></div><StatusBadge value={log.status} /></div><dl className="record-card__details"><div><dt>Department</dt><dd>{departmentName(log.department, '—')}</dd></div><div><dt>Priority</dt><dd><PriorityBadge value={log.priority} /></dd></div><div><dt>Issue type</dt><dd>{issueTypeNames(log.issue_types, options.issueTypes).join(', ') || '—'}</dd></div><div><dt>Updated</dt><dd>{formatDate(log.updated_at || log.issue_date)}</dd></div></dl><div className="record-card__actions"><Link className="button button--secondary button--small" to={`/support-logs/${log.id}`}><ClipboardList size={17} aria-hidden="true" />Open</Link></div></article>)}</div>
          <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} busy={loading} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}
