import {
  CalendarDays,
  ClipboardList,
  Edit3,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useSupportOptions } from '../hooks/useSupportOptions'
import { useToast } from '../hooks/useToast'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  PageHeader,
  Pagination,
  PriorityBadge,
  Skeleton,
  StatusBadge,
} from '../components/ui'
import { destroy, get, getErrorMessage, shouldIgnoreRequest } from '../lib/api'
import { supportPriorityOptions, supportStatusOptions, supportTicketSortOptions } from '../lib/constants'
import { formatDate, formatNumber } from '../lib/format'
import { canDeleteSupportLog, canEditSupportLog, departmentName, itemTypeName, issueTypeNames, listData, paginationFrom, referenceId, referenceName, userName } from '../lib/support'
import type { Paginated, SupportLog, User } from '../types'
import { useAuth } from '../context/AuthContext'

function displayUser(value: SupportLog['assigned_to'], users: User[], fallback = 'Unassigned'): string {
  const id = referenceId(value)
  if (id === undefined) return fallback
  return users.find((user) => String(user.id) === String(id))?.name || String(id)
}

export default function SupportLogsPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const options = useSupportOptions()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const debouncedSearch = useDebouncedValue(search)
  const [ticketNumber, setTicketNumber] = useState(() => searchParams.get('ticket_number') || '')
  const [dateFrom, setDateFrom] = useState(() => searchParams.get('date_from') || '')
  const [dateTo, setDateTo] = useState(() => searchParams.get('date_to') || '')
  const [departmentId, setDepartmentId] = useState(() => searchParams.get('department_id') || '')
  const [issueTypeId, setIssueTypeId] = useState(() => searchParams.get('issue_type_id') || '')
  const [itemTypeId, setItemTypeId] = useState(() => searchParams.get('item_type_id') || '')
  const [status, setStatus] = useState(() => searchParams.get('status') || '')
  const [priority, setPriority] = useState(() => searchParams.get('priority') || '')
  const [assignedTo, setAssignedTo] = useState(() => searchParams.get('assigned_to') || '')
  const [initiatedBy, setInitiatedBy] = useState(() => searchParams.get('initiated_by') || '')
  const [sortBy, setSortBy] = useState('issue_date')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [logs, setLogs] = useState<SupportLog[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<SupportLog | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const params = useMemo(() => ({
    search: debouncedSearch || undefined,
    ticket_number: ticketNumber || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    department_id: departmentId || undefined,
    issue_type_id: issueTypeId || undefined,
    item_type_id: itemTypeId || undefined,
    status: status || undefined,
    priority: priority || undefined,
    assigned_to: assignedTo || undefined,
    initiated_by: initiatedBy || undefined,
    sort_by: sortBy,
    sort_direction: sortDirection,
    per_page: 15,
    page,
  }), [assignedTo, dateFrom, dateTo, debouncedSearch, departmentId, initiatedBy, issueTypeId, itemTypeId, page, priority, sortBy, sortDirection, status, ticketNumber])

  const loadLogs = useCallback(async (signal?: AbortSignal) => {
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
  }, [page, params])

  useEffect(() => {
    const controller = new AbortController()
    void loadLogs(controller.signal)
    return () => controller.abort()
  }, [loadLogs, reloadKey])

  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setTicketNumber('')
    setDateFrom('')
    setDateTo('')
    setDepartmentId('')
    setIssueTypeId('')
    setItemTypeId('')
    setStatus('')
    setPriority('')
    setAssignedTo('')
    setInitiatedBy('')
    setPage(1)
  }

  const hasFilters = Boolean(search || ticketNumber || dateFrom || dateTo || departmentId || issueTypeId || itemTypeId || status || priority || assignedTo || initiatedBy)
  const assignableUsers = options.users.filter((candidate) => candidate.status !== 'inactive' && (candidate.role === 'technical_resource' || candidate.role === 'admin'))

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await destroy(`/v1/support-logs/${deleteTarget.id}`)
      notify(`Support log ${deleteTarget.ticket_number} was deleted.`)
      setDeleteTarget(null)
      setReloadKey((value) => value + 1)
    } catch (requestError: unknown) {
      notify(getErrorMessage(requestError), 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Service records"
        title="Support logs"
        description="Search, filter, and follow every support request from intake through closure."
        actions={<Link className="button button--primary button--default" to="/support-logs/new"><Plus size={18} aria-hidden="true" />Create support log</Link>}
      />

      {options.error && <div className="notice-banner" role="status"><SlidersHorizontal size={20} aria-hidden="true" /><div><strong>Some filter options could not load</strong><p>{options.error}</p></div><Button variant="secondary" size="small" onClick={options.reload}>Retry options</Button></div>}

      <section className="filter-panel" aria-labelledby="support-filters-title">
        <div className="filter-panel__heading">
          <div><Filter size={19} aria-hidden="true" /><h2 id="support-filters-title">Filter support logs</h2></div>
          {hasFilters && <Button variant="ghost" size="small" onClick={clearFilters}><X size={17} aria-hidden="true" />Reset filters</Button>}
        </div>
        <div className="filter-grid support-filter-grid">
          <div className="filter-field filter-field--search">
            <label htmlFor="support-search">Search</label>
            <div className="input-with-icon"><Search size={18} aria-hidden="true" /><input id="support-search" type="search" value={search} placeholder="Ticket, description, requester…" onChange={(event) => { setSearch(event.target.value); setPage(1) }} /></div>
          </div>
          <div className="filter-field">
            <label htmlFor="support-ticket">Ticket number</label>
            <input id="support-ticket" value={ticketNumber} placeholder="e.g. IT-000123" onChange={(event) => setFilter(setTicketNumber, event.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor="support-from">Issue from</label>
            <div className="input-with-icon"><CalendarDays size={18} aria-hidden="true" /><input id="support-from" type="date" value={dateFrom} onChange={(event) => setFilter(setDateFrom, event.target.value)} /></div>
          </div>
          <div className="filter-field">
            <label htmlFor="support-to">Issue to</label>
            <div className="input-with-icon"><CalendarDays size={18} aria-hidden="true" /><input id="support-to" type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => setFilter(setDateTo, event.target.value)} /></div>
          </div>
          <div className="filter-field">
            <label htmlFor="support-department">Department</label>
            <select id="support-department" value={departmentId} onChange={(event) => setFilter(setDepartmentId, event.target.value)}><option value="">All departments</option>{options.departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select>
          </div>
          <div className="filter-field">
            <label htmlFor="support-issue-type">Issue type</label>
            <select id="support-issue-type" value={issueTypeId} onChange={(event) => setFilter(setIssueTypeId, event.target.value)}><option value="">All issue types</option>{options.issueTypes.map((issueType) => <option value={issueType.id} key={issueType.id}>{issueType.name}</option>)}</select>
          </div>
          <div className="filter-field">
            <label htmlFor="support-item-type">Item type</label>
            <select id="support-item-type" value={itemTypeId} onChange={(event) => setFilter(setItemTypeId, event.target.value)}><option value="">All item types</option>{options.itemTypes.map((itemType) => <option value={itemType.id} key={itemType.id}>{itemType.name}</option>)}</select>
          </div>
          <div className="filter-field">
            <label htmlFor="support-status">Status</label>
            <select id="support-status" value={status} onChange={(event) => setFilter(setStatus, event.target.value)}><option value="">All statuses</option>{supportStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
          </div>
          <div className="filter-field">
            <label htmlFor="support-priority">Priority</label>
            <select id="support-priority" value={priority} onChange={(event) => setFilter(setPriority, event.target.value)}><option value="">All priorities</option>{supportPriorityOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
          </div>
          <div className="filter-field">
            <label htmlFor="support-resource">Assigned resource</label>
            <select id="support-resource" value={assignedTo} onChange={(event) => setFilter(setAssignedTo, event.target.value)}><option value="">All resources</option>{assignableUsers.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}</select>
          </div>
          <div className="filter-field">
            <label htmlFor="support-initiator">Initiator name</label>
            <input id="support-initiator" value={initiatedBy} placeholder="Search by requester name" onChange={(event) => setFilter(setInitiatedBy, event.target.value)} />
          </div>
        </div>
      </section>

      <div className="results-heading">
        <div><h2>Support log records</h2><p>{loading ? 'Loading results…' : `${formatNumber(meta.total)} ${meta.total === 1 ? 'record' : 'records'} found`}</p></div>
        <div className="results-heading__tools">
          <div className="sort-control"><label htmlFor="support-sort">Sort by</label><select id="support-sort" value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1) }}>{supportTicketSortOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
          <Button variant="secondary" size="small" onClick={() => { setSortDirection((current) => current === 'asc' ? 'desc' : 'asc'); setPage(1) }} aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}><SlidersHorizontal size={16} aria-hidden="true" />{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</Button>
        </div>
      </div>

      {loading ? <Skeleton count={7} /> : error ? <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : logs.length === 0 ? <EmptyState title="No support logs found" message={hasFilters ? 'Adjust or reset the filters to see more records.' : 'Create the first support request to get started.'} action={hasFilters ? <Button variant="secondary" onClick={clearFilters}>Reset filters</Button> : <Link className="button button--primary button--default" to="/support-logs/new">Create support log</Link>} /> : (
        <>
          <div className="table-card desktop-only">
            <div className="table-scroll"><table className="data-table support-table"><caption className="sr-only">Support log records</caption><thead><tr><th scope="col">Ticket / issue date</th><th scope="col">Department / initiator</th><th scope="col">Issue and item</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Assigned resource</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>
              {logs.map((log) => <tr key={log.id}><td><div className="entity-cell"><span className="entity-cell__icon"><ClipboardList size={19} aria-hidden="true" /></span><span><strong>{log.ticket_number}</strong><small>{formatDate(log.issue_date)}</small></span></div></td><td><span className="stacked-value"><span>{departmentName(log.department)}</span><small>{userName(log.initiated_by)}</small></span></td><td><span className="stacked-value"><span>{issueTypeNames(log.issue_types, options.issueTypes).join(', ') || 'No issue type'}</span><small>{itemTypeName(log.item_type, 'No item type')}</small></span></td><td><PriorityBadge value={log.priority} /></td><td><StatusBadge value={log.status} /></td><td>{referenceName(log.assigned_resource, '') || displayUser(log.assigned_to, options.users)}</td><td><div className="row-actions"><Link className="icon-button" to={`/support-logs/${log.id}`} aria-label={`Open ${log.ticket_number}`} title="Open support log"><ClipboardList size={18} aria-hidden="true" /></Link>{canEditSupportLog(user, log) && <Link className="icon-button" to={`/support-logs/${log.id}/edit`} aria-label={`Edit ${log.ticket_number}`} title="Edit support log"><Edit3 size={18} aria-hidden="true" /></Link>}{canDeleteSupportLog(user) && <IconButton label={`Archive ${log.ticket_number}`} onClick={() => setDeleteTarget(log)}><Trash2 size={18} aria-hidden="true" /></IconButton>}</div></td></tr>)}
            </tbody></table></div>
          </div>

          <div className="mobile-records mobile-only">
            {logs.map((log) => <article className="record-card" key={log.id}><div className="record-card__header"><div className="entity-cell"><span className="entity-cell__icon"><ClipboardList size={19} aria-hidden="true" /></span><span><strong>{log.ticket_number}</strong><small>{formatDate(log.issue_date)}</small></span></div><StatusBadge value={log.status} /></div><dl className="record-card__details"><div><dt>Department</dt><dd>{departmentName(log.department)}</dd></div><div><dt>Initiator</dt><dd>{userName(log.initiated_by)}</dd></div><div><dt>Issue types</dt><dd>{issueTypeNames(log.issue_types, options.issueTypes).join(', ') || '—'}</dd></div><div><dt>Priority</dt><dd><PriorityBadge value={log.priority} /></dd></div><div><dt>Assigned resource</dt><dd>{referenceName(log.assigned_resource, '') || displayUser(log.assigned_to, options.users)}</dd></div></dl><div className="record-card__actions"><Link className="button button--secondary button--small" to={`/support-logs/${log.id}`}><ClipboardList size={17} aria-hidden="true" />Open</Link>{canEditSupportLog(user, log) && <Link className="button button--ghost button--small" to={`/support-logs/${log.id}/edit`}><Edit3 size={17} aria-hidden="true" />Edit</Link>}{canDeleteSupportLog(user) && <Button variant="ghost" size="small" onClick={() => setDeleteTarget(log)}><Trash2 size={17} aria-hidden="true" />Archive</Button>}</div></article>)}
          </div>
          <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} busy={loading} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog open={Boolean(deleteTarget)} title="Archive this support log?" message={`Support log ${deleteTarget?.ticket_number || ''} will be hidden from the active queue but retained in historical data.`} busy={deleteBusy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
    </div>
  )
}
