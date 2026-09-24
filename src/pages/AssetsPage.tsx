import {
  Box,
  Edit3,
  Filter,
  HardDrive,
  Laptop,
  Plus,
  Printer,
  Search,
  Server,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
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
import { destroy, get, getErrorMessage, shouldIgnoreRequest } from '../lib/api'
import { assetTypeOptions, userStatusOptions } from '../lib/constants'
import { formatDate, formatNumber, titleCase } from '../lib/format'
import type { Asset, Department, Paginated } from '../types'

function assetTypeLabel(type: string): string {
  return assetTypeOptions.find((option) => option.value === type)?.label ?? titleCase(type)
}

function AssetTypeIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase()
  if (normalized.includes('laptop') || normalized.includes('computer')) return <Laptop size={19} aria-hidden="true" />
  if (normalized.includes('print')) return <Printer size={19} aria-hidden="true" />
  if (normalized.includes('server')) return <Server size={19} aria-hidden="true" />
  if (normalized.includes('network')) return <HardDrive size={19} aria-hidden="true" />
  return <Box size={19} aria-hidden="true" />
}

export default function AssetsPage() {
  const { notify } = useToast()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [assets, setAssets] = useState<Asset[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const params = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      department_id: departmentId || undefined,
      status: status || undefined,
      type: type || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      sort_by: sortBy,
      sort_direction: sortDirection,
      per_page: 15,
      page,
    }),
    [dateFrom, dateTo, debouncedSearch, departmentId, page, sortBy, sortDirection, status, type],
  )

  const loadAssets = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await get<Paginated<Asset>>('/v1/assets', { params, signal })
      setAssets(response.data ?? [])
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
    void loadAssets(controller.signal)
    return () => controller.abort()
  }, [loadAssets, reloadKey])

  useEffect(() => {
    get<Paginated<Department>>('/v1/departments', { params: { per_page: 100 } })
      .then((response) => setDepartments(response.data ?? []))
      .catch(() => setDepartments([]))
  }, [])

  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value)
    setPage(1)
  }

  const clearFilters = () => {
    setSearch('')
    setDepartmentId('')
    setStatus('')
    setType('')
    setDateFrom('')
    setDateTo('')
    setSortBy('created_at')
    setSortDirection('desc')
    setPage(1)
  }

  const hasFilters = Boolean(search || departmentId || status || type || dateFrom || dateTo)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await destroy(`/v1/assets/${deleteTarget.id}`)
      notify(`${deleteTarget.asset_tag || 'Asset'} was deleted.`)
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
        eyebrow="Inventory"
        title="Asset register"
        description="Search, review, and maintain every registered IT asset."
        actions={
          <Link className="button button--primary button--default" to="/assets/new">
            <Plus size={18} aria-hidden="true" />
            Register asset
          </Link>
        }
      />

      <section className="filter-panel" aria-labelledby="asset-filters-title">
        <div className="filter-panel__heading">
          <div>
            <Filter size={19} aria-hidden="true" />
            <h2 id="asset-filters-title">Filter assets</h2>
          </div>
          {hasFilters && (
            <Button variant="ghost" size="small" onClick={clearFilters}>
              <X size={17} aria-hidden="true" />
              Clear
            </Button>
          )}
        </div>
        <div className="filter-grid filter-grid--assets">
          <div className="filter-field filter-field--search">
            <label htmlFor="asset-search">Search</label>
            <div className="input-with-icon">
              <Search size={18} aria-hidden="true" />
              <input
                id="asset-search"
                type="search"
                value={search}
                placeholder="Tag, serial, brand, model…"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
              />
            </div>
          </div>
          <div className="filter-field">
            <label htmlFor="asset-department">Department</label>
            <select id="asset-department" value={departmentId} onChange={(event) => setFilter(setDepartmentId, event.target.value)}>
              <option value="">All departments</option>
              {departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="asset-status">Assigned user status</label>
            <select id="asset-status" value={status} onChange={(event) => setFilter(setStatus, event.target.value)}>
              <option value="">All statuses</option>
              {userStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="asset-type">Asset type</label>
            <select id="asset-type" value={type} onChange={(event) => setFilter(setType, event.target.value)}>
              <option value="">All types</option>
              {assetTypeOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="asset-date-from">Acquired from</label>
            <input id="asset-date-from" type="date" value={dateFrom} onChange={(event) => setFilter(setDateFrom, event.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor="asset-date-to">Acquired to</label>
            <input id="asset-date-to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setFilter(setDateTo, event.target.value)} />
          </div>
          <div className="filter-field">
            <label htmlFor="asset-sort">Sort by</label>
            <select id="asset-sort" value={sortBy} onChange={(event) => setFilter(setSortBy, event.target.value)}>
              <option value="created_at">Recently added</option>
              <option value="asset_tag">Asset tag</option>
              <option value="acquired_at">Acquired date</option>
              <option value="type">Asset type</option>
            </select>
          </div>
          <div className="filter-field">
            <label htmlFor="asset-direction">Direction</label>
            <select id="asset-direction" value={sortDirection} onChange={(event) => { setSortDirection(event.target.value as 'asc' | 'desc'); setPage(1) }}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
      </section>

      <div className="results-heading">
        <div>
          <h2>Asset records</h2>
          <p>{loading ? 'Loading results…' : `${formatNumber(meta.total)} ${meta.total === 1 ? 'asset' : 'assets'} found`}</p>
        </div>
      </div>

      {loading ? (
        <Skeleton count={7} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
      ) : assets.length === 0 ? (
        <EmptyState
          title="No assets found"
          message={hasFilters ? 'Adjust or clear the filters to see more records.' : 'Register the first asset to begin the inventory.'}
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>Clear filters</Button>
            ) : (
              <Link className="button button--primary button--default" to="/assets/new">Register asset</Link>
            )
          }
        />
      ) : (
        <>
          <div className="table-card desktop-only">
            <div className="table-scroll">
              <table className="data-table">
                <caption className="sr-only">Registered assets</caption>
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Assigned to</th>
                    <th scope="col">Department</th>
                    <th scope="col">Specifications</th>
                    <th scope="col">Latest inspection</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const inspectionStatus = asset.latest_inspection?.status || asset.status
                    return (
                      <tr key={asset.id}>
                        <td>
                          <div className="entity-cell">
                            <span className="entity-cell__icon"><AssetTypeIcon type={asset.type} /></span>
                            <span><strong>{asset.brand} {asset.model}</strong><small>{asset.asset_tag} · {assetTypeLabel(asset.type)}</small></span>
                          </div>
                        </td>
                        <td>
                          <span className="stacked-value">
                            <span><UserRound size={14} aria-hidden="true" /> {asset.user?.name || 'Unassigned'}</span>
                            <small>{asset.user?.email || 'No user record'}</small>
                          </span>
                        </td>
                        <td>{asset.department?.name || '—'}</td>
                        <td>
                          <span className="stacked-value">
                            <span>{asset.ram_gb ? `${asset.ram_gb} GB RAM` : asset.ram || 'RAM not recorded'}</span>
                            <small>{asset.storage || 'Storage not recorded'}</small>
                          </span>
                        </td>
                        <td>
                          <span className="stacked-value">
                            <StatusBadge value={inspectionStatus} />
                            <small>{formatDate(asset.latest_inspection?.inspection_date)}</small>
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <Link className="icon-button" to={`/assets/${asset.id}/edit`} aria-label={`Edit ${asset.asset_tag}`} title="Edit asset">
                              <Edit3 size={18} aria-hidden="true" />
                            </Link>
                            <IconButton label={`Delete ${asset.asset_tag}`} onClick={() => setDeleteTarget(asset)}>
                              <Trash2 size={18} aria-hidden="true" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mobile-records mobile-only">
            {assets.map((asset) => (
              <article className="record-card" key={asset.id}>
                <div className="record-card__header">
                  <div className="entity-cell">
                    <span className="entity-cell__icon"><AssetTypeIcon type={asset.type} /></span>
                    <span><strong>{asset.brand} {asset.model}</strong><small>{asset.asset_tag} · {assetTypeLabel(asset.type)}</small></span>
                  </div>
                  <StatusBadge value={asset.latest_inspection?.status || asset.status} />
                </div>
                <dl className="record-card__details">
                  <div><dt>Assigned to</dt><dd>{asset.user?.name || 'Unassigned'}</dd></div>
                  <div><dt>Department</dt><dd>{asset.department?.name || '—'}</dd></div>
                  <div><dt>Memory</dt><dd>{asset.ram_gb ? `${asset.ram_gb} GB` : asset.ram || '—'}</dd></div>
                  <div><dt>Acquired</dt><dd>{formatDate(asset.acquired_at)}</dd></div>
                </dl>
                <div className="record-card__actions">
                  <Link className="button button--secondary button--small" to={`/assets/${asset.id}/edit`}><Edit3 size={17} aria-hidden="true" /> Edit</Link>
                  <Button variant="ghost" size="small" onClick={() => setDeleteTarget(asset)}><Trash2 size={17} aria-hidden="true" /> Delete</Button>
                </div>
              </article>
            ))}
          </div>

          <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} busy={loading} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete this asset?"
        message={`${deleteTarget?.asset_tag || 'This asset'} and its linked inspection history may be affected. This action cannot be undone.`}
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
