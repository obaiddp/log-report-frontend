import { Building2, Edit3, Plus, Search, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useToast } from '../hooks/useToast'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormErrorSummary,
  FormField,
  IconButton,
  Modal,
  PageHeader,
  Pagination,
  Panel,
  Skeleton,
  StatusBadge,
} from '../components/ui'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { destroy, get, getErrorMessage, getFieldErrors, post, put, shouldIgnoreRequest } from '../lib/api'
import { userStatusOptions } from '../lib/constants'
import { formatNumber } from '../lib/format'
import { listData, paginationFrom } from '../lib/support'
import type { Department, FieldErrors, Paginated } from '../types'

interface DepartmentFormState {
  name: string
  code: string
  description: string
  status: string
}

const emptyForm: DepartmentFormState = { name: '', code: '', description: '', status: 'active' }

function DepartmentDialog({
  record,
  onClose,
  onSaved,
}: {
  record: Department | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const [form, setForm] = useState<DepartmentFormState>(() => record ? { name: record.name, code: record.code || '', description: record.description || '', status: record.status || 'active' } : emptyForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  const update = (field: keyof DepartmentFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => { if (!current[field]) return current; const next = { ...current }; delete next[field]; return next })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) { setErrors({ name: ['Enter a department name.'] }); window.requestAnimationFrame(() => summaryRef.current?.focus()); return }
    setSubmitting(true)
    setErrors({})
    setFormError('')
    const payload = { name: form.name.trim(), code: form.code.trim() || null, description: form.description.trim() || null, status: form.status }
    try {
      if (record) await put(`/v1/departments/${record.id}`, payload)
      else await post('/v1/departments', payload)
      onSaved(`${form.name.trim()} was ${record ? 'updated' : 'created'}.`)
    } catch (error: unknown) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : getErrorMessage(error))
      window.requestAnimationFrame(() => summaryRef.current?.focus())
    } finally { setSubmitting(false) }
  }

  return <Modal open title={`${record ? 'Edit' : 'Add'} department`} description="Departments organize support ownership and reporting." onClose={onClose} size="medium" footer={<><Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="submit" form="department-form" loading={submitting}>{record ? 'Save changes' : 'Create department'}</Button></>}>
    {formError && <div className="form-error-summary" role="alert"><strong>Unable to save this department</strong><p>{formError}</p></div>}
    <FormErrorSummary errors={errors} ref={summaryRef} />
    <form id="department-form" className="form-stack" onSubmit={submit} noValidate>
      <FormField label="Department name" required error={errors.name?.[0]} inputId="name">
        {(fieldProps) => <input {...fieldProps} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Finance" />}
      </FormField>
      <FormField label="Department code" error={errors.code?.[0]} inputId="code" hint="Optional short internal code.">
        {(fieldProps) => <input {...fieldProps} value={form.code} onChange={(event) => update('code', event.target.value)} placeholder="e.g. FIN" />}
      </FormField>
      <FormField label="Description" error={errors.description?.[0]} inputId="description">
        {(fieldProps) => <textarea {...fieldProps} rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="What this department supports" />}
      </FormField>
      <FormField label="Status" required error={errors.status?.[0]} inputId="status">
        {(fieldProps) => <select {...fieldProps} value={form.status} onChange={(event) => update('status', event.target.value)}>{userStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>}
      </FormField>
    </form>
  </Modal>
}

export default function AdminDepartmentsPage() {
  const { notify } = useToast()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [records, setRecords] = useState<Department[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Department | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('')
    try {
      const response = await get<Paginated<Department>>('/v1/departments', { params: { search: debouncedSearch || undefined, per_page: 15, page, sort_by: 'name', sort_direction: 'asc' }, signal })
      setRecords(listData(response)); setMeta(paginationFrom(response, page))
    } catch (requestError: unknown) { if (!shouldIgnoreRequest(requestError)) setError(getErrorMessage(requestError)) }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [debouncedSearch, page])

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load, reloadKey])

  const saved = (message: string) => { setEditing(undefined); notify(message); setReloadKey((value) => value + 1) }
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try { await destroy(`/v1/departments/${deleteTarget.id}`); notify(`${deleteTarget.name} was deleted.`); setDeleteTarget(null); setReloadKey((value) => value + 1) }
    catch (requestError: unknown) { notify(getErrorMessage(requestError), 'error') }
    finally { setDeleteBusy(false) }
  }

  return <div className="page-stack">
    <PageHeader eyebrow="Administration" title="Departments" description="Maintain the departments used to route and report support work." actions={<Button onClick={() => setEditing(null)}><Plus size={18} aria-hidden="true" />Add department</Button>} />
    <Panel className="admin-toolbar"><div className="resource-search"><label htmlFor="department-search">Search departments</label><div className="input-with-icon"><Search size={18} aria-hidden="true" /><input id="department-search" type="search" value={search} placeholder="Name or code…" onChange={(event) => { setSearch(event.target.value); setPage(1) }} />{search && <IconButton label="Clear search" onClick={() => setSearch('')}><X size={17} aria-hidden="true" /></IconButton>}</div></div><p>{loading ? 'Loading…' : `${formatNumber(meta.total)} ${meta.total === 1 ? 'department' : 'departments'}`}</p></Panel>
    {loading ? <Skeleton count={6} /> : error ? <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : records.length === 0 ? <EmptyState title="No departments found" message={search ? 'Try a different search term.' : 'Add the first department to organize support work.'} action={<Button onClick={() => setEditing(null)}><Plus size={18} aria-hidden="true" />Add department</Button>} /> : <>
      <div className="table-card desktop-only"><div className="table-scroll"><table className="data-table"><caption className="sr-only">Departments</caption><thead><tr><th scope="col">Department</th><th scope="col">Code</th><th scope="col">Description</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><div className="entity-cell"><span className="entity-cell__icon"><Building2 size={19} aria-hidden="true" /></span><span><strong>{record.name}</strong><small>Department #{record.id}</small></span></div></td><td><code>{record.code || '—'}</code></td><td>{record.description || '—'}</td><td><StatusBadge value={record.status} /></td><td><div className="row-actions"><IconButton label={`Edit ${record.name}`} onClick={() => setEditing(record)}><Edit3 size={18} aria-hidden="true" /></IconButton><IconButton label={`Delete ${record.name}`} onClick={() => setDeleteTarget(record)}><Trash2 size={18} aria-hidden="true" /></IconButton></div></td></tr>)}</tbody></table></div></div>
      <div className="mobile-records mobile-only">{records.map((record) => <article className="record-card" key={record.id}><div className="record-card__header"><div className="entity-cell"><span className="entity-cell__icon"><Building2 size={19} aria-hidden="true" /></span><span><strong>{record.name}</strong><small>{record.code || 'Department'}</small></span></div><StatusBadge value={record.status} /></div><p>{record.description || 'No description.'}</p><div className="record-card__actions"><Button variant="secondary" size="small" onClick={() => setEditing(record)}><Edit3 size={17} aria-hidden="true" />Edit</Button><Button variant="ghost" size="small" onClick={() => setDeleteTarget(record)}><Trash2 size={17} aria-hidden="true" />Delete</Button></div></article>)}</div>
      <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} busy={loading} onPageChange={setPage} />
    </>}
    {editing !== undefined && <DepartmentDialog record={editing} onClose={() => setEditing(undefined)} onSaved={saved} />}
    <ConfirmDialog open={Boolean(deleteTarget)} title="Delete this department?" message={`${deleteTarget?.name || 'This department'} may be linked to support logs. This action cannot be undone.`} busy={deleteBusy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
  </div>
}
