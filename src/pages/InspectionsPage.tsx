import {
  CalendarDays,
  ClipboardCheck,
  Edit3,
  Filter,
  Plus,
  Search,
  Trash2,
  UserRoundCog,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  IconButton,
  PageHeader,
  Pagination,
  Skeleton,
  StatusBadge,
} from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { destroy, get, getErrorMessage, shouldIgnoreRequest } from '../lib/api'
import { inspectionCategoryOptions, inspectionStatusOptions } from '../lib/constants'
import { formatDate, formatNumber, titleCase } from '../lib/format'
import type { Inspection, Paginated, TechnicalPersonnel } from '../types'

export default function InspectionsPage() {
  const { notify } = useToast()
  const { user } = useAuth()
  const canManage = user?.role === 'admin' || user?.role === 'technician'
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [personnel, setPersonnel] = useState<TechnicalPersonnel[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Inspection | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status || undefined,
      category: category || undefined,
      technical_personnel_id: technicianId || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      sort_by: 'inspection_date',
      sort_direction: 'desc' as const,
      per_page: 15,
      page,
    }),
    [category, dateFrom, dateTo, debouncedSearch, page, status, technicianId],
  )

  const loadInspections = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await get<Paginated<Inspection>>('/v1/inspections', { params, signal })
      setInspections(response.data ?? [])
      setMeta({
        current_page: response.meta?.current_page ?? page,
        last_page: response.meta?.last_page ?? 1,
        total: response.meta?.total ?? response.data?.length ?? 0,
      })
    } catch (requestError) {
      if (!shouldIgnoreRequest(requestError)) setError(getErrorMessage(requestError))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [page, params])

  useEffect(() => {
    const controller = new AbortController()
    void loadInspections(controller.signal)
    return () => controller.abort()
  }, [loadInspections, reloadKey])

  useEffect(() => {
    get<Paginated<TechnicalPersonnel>>('/v1/technical-personnel', {
      params: { per_page: 100, sort_by: 'name', sort_direction: 'asc' },
    })
      .then((response) => setPersonnel(response.data ?? []))
      .catch(() => setPersonnel([]))
  }, [])

  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setCategory('')
    setTechnicianId('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const hasFilters = Boolean(search || status || category || technicianId || dateFrom || dateTo)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await destroy(`/v1/inspections/${deleteTarget.id}`)
      notify(`Inspection ${deleteTarget.problem_id} was deleted.`)
      setDeleteTarget(null)
      setReloadKey((value) => value + 1)
    } catch (requestError) {
      notify(getErrorMessage(requestError), 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Service records"
        title="Inspections"
        description="Review assignments, service categories, and resolution progress."
        actions={
          canManage ? (
            <Link className="button button--primary button--default" to="/inspection-form">
              <Plus size={18} aria-hidden="true" />
              New inspection
            </Link>
          ) : undefined
        }
      />

      <section className="filter-panel" aria-labelledby="inspection-filters-title">
        <div className="filter-panel__heading">
          <div>
            <Filter size={19} aria-hidden="true" />
            <h2 id="inspection-filters-title">Filter inspections</h2>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="small" onClick={clearFilters}>
              <X size={17} aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
        <div className="filter-grid filter-grid--inspections">
          <div className="filter-field filter-field--search">
            <label htmlFor="inspection-search">Search</label>
            <div className="input-with-icon">
              <Search size={18} aria-hidden="true" />
              <input
                id="inspection-search"
                type="search"
                value={search}
                placeholder="Problem ID, remarks, asset…"
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              />
            </div>
          </div>
          <div className="filter-field">
            <label htmlFor="inspection-status">Status</label>
            <select id="inspection-status" value={status} onChange={(event) => setFilter(setStatus, event.target.value)}>
              <option value="">All statuses</option>
              {inspectionStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="inspection-category">Category</label>
            <select id="inspection-category" value={category} onChange={(event) => setFilter(setCategory, event.target.value)}>
              <option value="">All categories</option>
              {inspectionCategoryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="inspection-technician">Technical personnel</label>
            <select id="inspection-technician" value={technicianId} onChange={(event) => setFilter(setTechnicianId, event.target.value)}>
              <option value="">All personnel</option>
              {personnel.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="inspection-from">Inspected from</label>
            <div className="input-with-icon">
              <CalendarDays size={18} aria-hidden="true" />
              <input id="inspection-from" type="date" value={dateFrom} onChange={(event) => setFilter(setDateFrom, event.target.value)} />
            </div>
          </div>
          <div className="filter-field">
            <label htmlFor="inspection-to">Inspected to</label>
            <div className="input-with-icon">
              <CalendarDays size={18} aria-hidden="true" />
              <input id="inspection-to" type="date" min={dateFrom || undefined} value={dateTo} onChange={(event) => setFilter(setDateTo, event.target.value)} />
            </div>
          </div>
        </div>
      </section>

      <div className="results-heading">
        <div>
          <h2>Inspection records</h2>
          <p>{loading ? 'Loading results…' : `${formatNumber(meta.total)} ${meta.total === 1 ? 'record' : 'records'} found`}</p>
        </div>
      </div>

      {loading ? (
        <Skeleton count={7} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : inspections.length === 0 ? (
        <EmptyState
          title="No inspections found"
          message={hasFilters ? 'Adjust or clear the filters to see more records.' : 'Create the first structured asset inspection record.'}
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
            ) : canManage ? (
              <Link className="button button--primary button--default" to="/inspection-form">New inspection</Link>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="table-card desktop-only">
            <div className="table-scroll">
              <table className="data-table">
                <caption className="sr-only">Asset inspection records</caption>
                <thead>
                  <tr>
                    <th scope="col">Inspection</th>
                    <th scope="col">Asset / user</th>
                    <th scope="col">Category / repair location</th>
                    <th scope="col">Assigned personnel</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.map((inspection) => (
                    <tr key={inspection.id}>
                      <td>
                        <div className="entity-cell">
                          <span className="entity-cell__icon"><ClipboardCheck size={19} aria-hidden="true" /></span>
                          <span><strong>{inspection.problem_id}</strong><small>{formatDate(inspection.inspection_date)}</small></span>
                        </div>
                      </td>
                      <td>
                        <span className="stacked-value">
                          <span>{inspection.asset?.asset_tag || `Asset #${inspection.asset_id ?? '—'}`}</span>
                          <small>{inspection.user?.name || 'No assigned user'}</small>
                        </span>
                      </td>
                      <td>
                        <span className="stacked-value">
                          <span>{titleCase(inspection.category)}</span>
                          <small>{inspection.sub_category ? titleCase(inspection.sub_category) : 'No repair location'}</small>
                        </span>
                      </td>
                      <td>
                        <span className="stacked-value">
                          <span><UserRoundCog size={14} aria-hidden="true" /> {inspection.technical_personnel?.name || 'Unassigned'}</span>
                          <small>{inspection.technical_personnel?.email || 'No technician selected'}</small>
                        </span>
                      </td>
                      <td><StatusBadge value={inspection.status} /></td>
                      <td>
                        {canManage && (
                          <div className="row-actions">
                            <Link className="icon-button" to={`/inspections/${inspection.id}/edit`} aria-label={`Edit inspection ${inspection.problem_id}`} title="Edit inspection">
                              <Edit3 size={18} aria-hidden="true" />
                            </Link>
                            <IconButton label={`Delete inspection ${inspection.problem_id}`} onClick={() => setDeleteTarget(inspection)}>
                              <Trash2 size={18} aria-hidden="true" />
                            </IconButton>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mobile-records mobile-only">
            {inspections.map((inspection) => (
              <article className="record-card" key={inspection.id}>
                <div className="record-card__header">
                  <div className="entity-cell">
                    <span className="entity-cell__icon"><ClipboardCheck size={19} aria-hidden="true" /></span>
                    <span><strong>{inspection.problem_id}</strong><small>{formatDate(inspection.inspection_date)}</small></span>
                  </div>
                  <StatusBadge value={inspection.status} />
                </div>
                <dl className="record-card__details">
                  <div><dt>Asset</dt><dd>{inspection.asset?.asset_tag || `Asset #${inspection.asset_id ?? '—'}`}</dd></div>
                  <div><dt>User</dt><dd>{inspection.user?.name || 'Unassigned'}</dd></div>
                  <div><dt>Category</dt><dd>{titleCase(inspection.category)}{inspection.sub_category ? ` · ${titleCase(inspection.sub_category)}` : ''}</dd></div>
                  <div><dt>Personnel</dt><dd>{inspection.technical_personnel?.name || 'Unassigned'}</dd></div>
                </dl>
                {canManage && (
                  <div className="record-card__actions">
                    <Link className="button button--secondary button--small" to={`/inspections/${inspection.id}/edit`}><Edit3 size={17} aria-hidden="true" /> Edit</Link>
                    <Button variant="ghost" size="small" onClick={() => setDeleteTarget(inspection)}><Trash2 size={17} aria-hidden="true" /> Delete</Button>
                  </div>
                )}
              </article>
            ))}
          </div>

          <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} busy={loading} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this inspection?"
        message={`Inspection ${deleteTarget?.problem_id || ''} will be permanently removed. This action cannot be undone.`}
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
