import {
  Building2,
  Edit3,
  Mail,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react'
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
  LoadingState,
  Modal,
  PageHeader,
  Pagination,
  StatusBadge,
} from '../components/ui'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { destroy, get, getErrorMessage, getFieldErrors, post, put, shouldIgnoreRequest } from '../lib/api'
import { userRoleOptions, userStatusOptions } from '../lib/constants'
import { formatNumber, titleCase } from '../lib/format'
import type {
  Department,
  EntityId,
  FieldErrors,
  Paginated,
  TechnicalPersonnel,
  User,
} from '../types'

type ResourceKind = 'departments' | 'technical-personnel' | 'users'
type ResourceRecord = Department | TechnicalPersonnel | User

interface ResourceFormState {
  name: string
  code: string
  description: string
  email: string
  phone: string
  departmentId: EntityId | ''
  designation: string
  specialization: string
  territory: string
  status: string
  role: string
}

const emptyForm: ResourceFormState = {
  name: '',
  code: '',
  description: '',
  email: '',
  phone: '',
  departmentId: '',
  designation: '',
  specialization: '',
  territory: '',
  status: 'active',
  role: 'user',
}

const tabDetails: Array<{ id: ResourceKind; label: string; icon: typeof Building2; singular: string }> = [
  { id: 'departments', label: 'Departments', icon: Building2, singular: 'department' },
  { id: 'technical-personnel', label: 'Technical personnel', icon: UserRound, singular: 'technical person' },
  { id: 'users', label: 'Users', icon: UsersRound, singular: 'user' },
]

function formFromRecord(record: ResourceRecord | null): ResourceFormState {
  if (!record) return emptyForm
  const departmentId = 'department_id' in record ? record.department_id : null
  return {
    name: record.name,
    code: 'code' in record ? record.code ?? '' : '',
    description: 'description' in record ? record.description ?? '' : '',
    email: 'email' in record ? record.email ?? '' : '',
    phone: 'phone' in record ? record.phone ?? '' : '',
    departmentId: departmentId ?? '',
    designation: 'designation' in record ? record.designation ?? '' : '',
    specialization: 'specialization' in record ? record.specialization ?? '' : '',
    territory: 'territory' in record ? record.territory ?? '' : '',
    status: record.status ?? 'active',
    role: 'role' in record ? record.role ?? 'user' : '',
  }
}

function ResourceDialog({
  kind,
  record,
  departments,
  onClose,
  onSaved,
}: {
  kind: ResourceKind
  record: ResourceRecord | null
  departments: Department[]
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const summaryRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<ResourceFormState>(() => formFromRecord(record))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const singular = kind === 'departments' ? 'department' : kind === 'users' ? 'user' : 'technical person'

  const update = (field: keyof ResourceFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const validate = () => {
    const nextErrors: FieldErrors = {}
    if (!form.name.trim()) nextErrors.name = [`Enter the ${singular} name.`]
    if (kind === 'users') {
      if (!form.email.trim()) nextErrors.email = ['Enter the user email address.']
      else if (!/^\S+@\S+\.\S+$/.test(form.email)) nextErrors.email = ['Enter a valid email address.']
      if (!form.departmentId) nextErrors.department_id = ['Select a department.']
    }
    if (kind === 'technical-personnel' && !form.departmentId) {
      nextErrors.department_id = ['Select a department.']
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) {
      nextErrors.email = ['Enter a valid email address.']
    }
    return nextErrors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validate()
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      setFormError('')
      window.requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    const payload: Record<string, unknown> = { status: form.status }
    if (kind === 'departments') {
      payload.name = form.name.trim()
      payload.code = form.code.trim() || null
      payload.description = form.description.trim() || null
    } else {
      payload.name = form.name.trim()
      payload.department_id = form.departmentId
      if (kind === 'technical-personnel') {
        payload.email = form.email.trim() || null
        payload.phone = form.phone.trim() || null
        payload.specialization = form.specialization.trim() || null
        payload.designation = form.designation.trim() || null
      } else {
        payload.email = form.email.trim()
        payload.designation = form.designation.trim() || null
        payload.territory = form.territory.trim() || null
        payload.role = form.role
      }
    }

    setSubmitting(true)
    setErrors({})
    setFormError('')
    try {
      if (record) await put(`/v1/${kind}/${record.id}`, payload)
      else await post(`/v1/${kind}`, payload)
      onSaved(`${form.name} was ${record ? 'updated' : 'created'}.`)
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : getErrorMessage(error))
      window.requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open
      title={`${record ? 'Edit' : 'Add'} ${singular}`}
      description="Changes are saved directly to the resource API."
      onClose={onClose}
      size="large"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="resource-form" loading={submitting}>
            {record ? 'Save changes' : `Create ${singular}`}
          </Button>
        </>
      }
    >
      {formError && (
        <div className="form-error-summary" role="alert">
          <strong>Unable to save this {singular}</strong>
          <p>{formError}</p>
        </div>
      )}
      <FormErrorSummary errors={errors} ref={summaryRef} />
      <form id="resource-form" className="form-stack" onSubmit={handleSubmit} noValidate>
        <div className="form-grid form-grid--two">
          <FormField label="Name" required error={errors.name?.[0]} inputId="name" className={kind === 'departments' ? 'form-grid__full' : ''}>
            {(fieldProps) => <input {...fieldProps} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Full name or department name" />}
          </FormField>

          {kind === 'departments' ? (
            <>
              <FormField label="Department code" error={errors.code?.[0]} inputId="code" hint="Optional short internal code.">
                {(fieldProps) => <input {...fieldProps} value={form.code} onChange={(event) => update('code', event.target.value)} placeholder="e.g. IT-OPS" />}
              </FormField>
              <FormField label="Description" error={errors.description?.[0]} inputId="description" className="form-grid__full">
                {(fieldProps) => <textarea {...fieldProps} rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Department purpose or scope" />}
              </FormField>
            </>
          ) : (
            <>
              <FormField label="Email" required={kind === 'users'} error={errors.email?.[0]} inputId="email">
                {(fieldProps) => <div className="input-with-icon"><Mail size={18} aria-hidden="true" /><input {...fieldProps} type="email" autoComplete="off" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="name@company.com" /></div>}
              </FormField>
              <FormField label="Department" required error={errors.department_id?.[0]} inputId="department_id">
                {(fieldProps) => (
                  <select {...fieldProps} value={form.departmentId} onChange={(event) => update('departmentId', event.target.value)}>
                    <option value="">Select department</option>
                    {departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}
                  </select>
                )}
              </FormField>
              <FormField label="Designation" error={errors.designation?.[0]} inputId="designation">
                {(fieldProps) => <input {...fieldProps} value={form.designation} onChange={(event) => update('designation', event.target.value)} placeholder="Job title" />}
              </FormField>
              {kind === 'technical-personnel' ? (
                <>
                  <FormField label="Phone" error={errors.phone?.[0]} inputId="phone">
                    {(fieldProps) => <div className="input-with-icon"><Phone size={18} aria-hidden="true" /><input {...fieldProps} type="tel" autoComplete="off" value={form.phone} onChange={(event) => update('phone', event.target.value)} placeholder="+1 555 0100" /></div>}
                  </FormField>
                  <FormField label="Specialization" error={errors.specialization?.[0]} inputId="specialization">
                    {(fieldProps) => <input {...fieldProps} value={form.specialization} onChange={(event) => update('specialization', event.target.value)} placeholder="Hardware, network…" />}
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="Territory" error={errors.territory?.[0]} inputId="territory">
                    {(fieldProps) => <input {...fieldProps} value={form.territory} onChange={(event) => update('territory', event.target.value)} placeholder="Region or territory" />}
                  </FormField>
                  <FormField label="Role" required error={errors.role?.[0]} inputId="role">
                    {(fieldProps) => (
                      <select {...fieldProps} value={form.role} onChange={(event) => update('role', event.target.value)}>
                        {userRoleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                      </select>
                    )}
                  </FormField>
                </>
              )}
            </>
          )}

          <FormField label="Status" required error={errors.status?.[0]} inputId="status">
            {(fieldProps) => (
              <select {...fieldProps} value={form.status} onChange={(event) => update('status', event.target.value)}>
                {userStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
              </select>
            )}
          </FormField>

        </div>
      </form>
    </Modal>
  )
}

export default function ResourcesPage() {
  const { notify } = useToast()
  const [activeTab, setActiveTab] = useState<ResourceKind>('departments')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [records, setRecords] = useState<ResourceRecord[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<ResourceRecord | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<ResourceRecord | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const loadResources = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await get<Paginated<ResourceRecord>>(`/v1/${activeTab}`, {
        params: {
          search: debouncedSearch || undefined,
          per_page: 15,
          page,
          sort_by: 'name',
          sort_direction: 'asc',
        },
        signal,
      })
      setRecords(response.data ?? [])
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
  }, [activeTab, debouncedSearch, page])

  useEffect(() => {
    const controller = new AbortController()
    void loadResources(controller.signal)
    return () => controller.abort()
  }, [loadResources, reloadKey])

  useEffect(() => {
    get<Paginated<Department>>('/v1/departments', { params: { per_page: 100, sort_by: 'name' } })
      .then((response) => setDepartments(response.data ?? []))
      .catch(() => setDepartments([]))
  }, [reloadKey])

  const changeTab = (tab: ResourceKind) => {
    setActiveTab(tab)
    setSearch('')
    setPage(1)
    setEditing(undefined)
  }

  const handleTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    let nextIndex = index
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabDetails.length
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabDetails.length) % tabDetails.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabDetails.length - 1
    const next = tabDetails[nextIndex]
    changeTab(next.id)
    document.getElementById(`resource-tab-${next.id}`)?.focus()
  }

  const saved = (message: string) => {
    setEditing(undefined)
    notify(message)
    setReloadKey((value) => value + 1)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleteBusy(true)
    try {
      await destroy(`/v1/${activeTab}/${deleteTarget.id}`)
      notify(`${deleteTarget.name} was deleted.`)
      setDeleteTarget(null)
      setReloadKey((value) => value + 1)
    } catch (requestError) {
      notify(getErrorMessage(requestError), 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  const singular = tabDetails.find((tab) => tab.id === activeTab)?.singular || 'record'

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Administration"
        title="Resource management"
        description="Maintain the departments, technical personnel, and users used throughout asset workflows."
        actions={
          <Button onClick={() => setEditing(null)}>
            <Plus size={18} aria-hidden="true" />
            Add {singular}
          </Button>
        }
      />

      <div className="resource-tabs" role="tablist" aria-label="Resource types">
        {tabDetails.map((tab, index) => {
          const Icon = tab.icon
          const selected = activeTab === tab.id
          return (
            <button
              id={`resource-tab-${tab.id}`}
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`resource-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? 'active' : ''}
              onClick={() => changeTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <Icon size={19} aria-hidden="true" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <section
        id={`resource-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`resource-tab-${activeTab}`}
        className="resource-panel"
      >
        <div className="resource-toolbar">
          <div className="resource-search">
            <label htmlFor="resource-search">Search {activeTab.replace('-', ' ')}</label>
            <div className="input-with-icon">
              <Search size={18} aria-hidden="true" />
              <input
                id="resource-search"
                type="search"
                value={search}
                placeholder={`Search by name${activeTab === 'users' || activeTab === 'technical-personnel' ? ' or email' : ''}…`}
                onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              />
              {search && <IconButton label="Clear search" onClick={() => setSearch('')}><X size={17} aria-hidden="true" /></IconButton>}
            </div>
          </div>
          <p>
            {loading
              ? 'Loading…'
              : `${formatNumber(meta.total)} ${
                  activeTab === 'departments'
                    ? 'departments'
                    : activeTab === 'technical-personnel'
                      ? 'technical personnel'
                      : 'users'
                }`}
          </p>
        </div>

        {loading ? (
          <LoadingState label={`Loading ${activeTab.replace('-', ' ')}`} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
        ) : records.length === 0 ? (
          <EmptyState
            title={`No ${activeTab.replace('-', ' ')} found`}
            message={search ? 'Try a different search term.' : `Create the first ${singular} to use it in asset workflows.`}
            action={<Button onClick={() => setEditing(null)}><Plus size={18} aria-hidden="true" />Add {singular}</Button>}
          />
        ) : (
          <>
            <div className="table-card desktop-only">
              <div className="table-scroll">
                <table className="data-table">
                  <caption className="sr-only">{tabDetails.find((tab) => tab.id === activeTab)?.label}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Name</th>
                      {activeTab !== 'departments' && <th scope="col">Contact</th>}
                      <th scope="col">Department</th>
                      {activeTab === 'departments' && <th scope="col">Code</th>}
                      {activeTab === 'users' && <th scope="col">Role / designation</th>}
                      {activeTab === 'technical-personnel' && <th scope="col">Specialization</th>}
                      <th scope="col">Status</th>
                      <th scope="col"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td>
                          <div className="entity-cell">
                            <span className="entity-cell__icon">
                              {activeTab === 'departments' ? <Building2 size={19} aria-hidden="true" /> : <UserRound size={19} aria-hidden="true" />}
                            </span>
                            <span>
                              <strong>{record.name}</strong>
                              <small>
                                {activeTab === 'departments'
                                  ? ('description' in record ? record.description || 'Department' : 'Department')
                                  : ('email' in record ? record.email || 'No email' : 'No email')}
                              </small>
                            </span>
                          </div>
                        </td>
                        {activeTab !== 'departments' && (
                          <td>
                            <span className="stacked-value">
                              <span>{'email' in record ? record.email || '—' : '—'}</span>
                              {'phone' in record && record.phone && <small>{record.phone}</small>}
                            </span>
                          </td>
                        )}
                        <td>{'department' in record ? record.department?.name || 'Unassigned' : '—'}</td>
                        {activeTab === 'departments' && <td><code>{'code' in record ? record.code || '—' : '—'}</code></td>}
                        {activeTab === 'users' && <td>{'role' in record ? titleCase(record.role) : '—'}</td>}
                        {activeTab === 'technical-personnel' && <td>{'specialization' in record ? record.specialization || 'General' : '—'}</td>}
                        <td><StatusBadge value={record.status} /></td>
                        <td>
                          <div className="row-actions">
                            <IconButton label={`Edit ${record.name}`} onClick={() => setEditing(record)}><Edit3 size={18} aria-hidden="true" /></IconButton>
                            <IconButton label={`Delete ${record.name}`} onClick={() => setDeleteTarget(record)}><Trash2 size={18} aria-hidden="true" /></IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mobile-records mobile-only">
              {records.map((record) => (
                <article className="record-card" key={record.id}>
                  <div className="record-card__header">
                    <div className="entity-cell">
                      <span className="entity-cell__icon">{activeTab === 'departments' ? <Building2 size={19} aria-hidden="true" /> : <UserRound size={19} aria-hidden="true" />}</span>
                      <span>
                        <strong>{record.name}</strong>
                        <small>
                          {activeTab === 'departments'
                            ? ('code' in record ? record.code || 'Department' : 'Department')
                            : activeTab === 'technical-personnel'
                              ? ('specialization' in record ? record.specialization || 'Technical personnel' : 'Technical personnel')
                              : ('email' in record ? record.email : 'No email')}
                        </small>
                      </span>
                    </div>
                    <StatusBadge value={record.status} />
                  </div>
                  <dl className="record-card__details">
                    <div><dt>Department</dt><dd>{'department' in record ? record.department?.name || 'Unassigned' : '—'}</dd></div>
                    {activeTab === 'users' && <div><dt>Role</dt><dd>{'role' in record ? titleCase(record.role) : '—'}</dd></div>}
                    {activeTab === 'technical-personnel' && <div><dt>Contact</dt><dd>{'phone' in record ? record.phone || record.email || '—' : '—'}</dd></div>}
                  </dl>
                  <div className="record-card__actions">
                    <Button variant="secondary" size="small" onClick={() => setEditing(record)}><Edit3 size={17} aria-hidden="true" />Edit</Button>
                    <Button variant="ghost" size="small" onClick={() => setDeleteTarget(record)}><Trash2 size={17} aria-hidden="true" />Delete</Button>
                  </div>
                </article>
              ))}
            </div>

            <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} onPageChange={setPage} busy={loading} />
          </>
        )}
      </section>

      {editing !== undefined && (
        <ResourceDialog
          kind={activeTab}
          record={editing}
          departments={departments}
          onClose={() => setEditing(undefined)}
          onSaved={saved}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete this ${singular}?`}
        message={`${deleteTarget?.name || 'This record'} may be linked to assets or inspections. This action cannot be undone.`}
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
