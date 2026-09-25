import { Edit3, Mail, Plus, Search, ShieldCheck, Trash2, UserRound, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { useSupportOptions } from '../hooks/useSupportOptions'
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
import { userRoleOptions, userStatusOptions } from '../lib/constants'
import { formatNumber, titleCase } from '../lib/format'
import { listData, paginationFrom } from '../lib/support'
import type { FieldErrors, Paginated, User } from '../types'

interface UserFormState {
  name: string
  email: string
  password: string
  departmentId: string
  designation: string
  role: string
  status: string
}

const emptyForm: UserFormState = { name: '', email: '', password: '', departmentId: '', designation: '', role: 'technical_resource', status: 'active' }

function UserDialog({ record, departments, onClose, onSaved }: { record: User | null; departments: Array<{ id: string | number; name: string }>; onClose: () => void; onSaved: (message: string) => void }) {
  const [form, setForm] = useState<UserFormState>(() => record ? { name: record.name, email: record.email || '', password: '', departmentId: record.department_id ? String(record.department_id) : '', designation: record.designation || '', role: record.role || 'technical_resource', status: record.status || 'active' } : emptyForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)

  const update = (field: keyof UserFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => { if (!current[field]) return current; const next = { ...current }; delete next[field]; return next })
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation: FieldErrors = {}
    if (!form.name.trim()) validation.name = ['Enter the user name.']
    if (!form.email.trim()) validation.email = ['Enter the user email address.']
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) validation.email = ['Enter a valid email address.']
    if (!record && !form.password) validation.password = ['Enter a temporary password.']
    if (!form.departmentId) validation.department_id = ['Select a department.']
    if (Object.keys(validation).length > 0) { setErrors(validation); setFormError(''); window.requestAnimationFrame(() => summaryRef.current?.focus()); return }
    setSubmitting(true); setErrors({}); setFormError('')
    const payload: Record<string, unknown> = { name: form.name.trim(), email: form.email.trim(), department_id: form.departmentId, designation: form.designation.trim() || null, role: form.role, status: form.status }
    if (form.password) payload.password = form.password
    try { if (record) await put(`/v1/users/${record.id}`, payload); else await post('/v1/users', payload); onSaved(`${form.name.trim()} was ${record ? 'updated' : 'created'}.`) }
    catch (error: unknown) { const fieldErrors = getFieldErrors(error); setErrors(fieldErrors); setFormError(Object.keys(fieldErrors).length > 0 ? '' : getErrorMessage(error)); window.requestAnimationFrame(() => summaryRef.current?.focus()) }
    finally { setSubmitting(false) }
  }
  return <Modal open title={`${record ? 'Edit' : 'Add'} user`} description="Manage the people who can initiate, own, and resolve support work." onClose={onClose} size="large" footer={<><Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="submit" form="user-form" loading={submitting}>{record ? 'Save changes' : 'Create user'}</Button></>}>
    {formError && <div className="form-error-summary" role="alert"><strong>Unable to save this user</strong><p>{formError}</p></div>}
    <FormErrorSummary errors={errors} ref={summaryRef} />
    <form id="user-form" className="form-stack" onSubmit={submit} noValidate><div className="form-grid form-grid--two">
      <FormField label="Full name" required error={errors.name?.[0]} inputId="user-name">
        {(fieldProps) => <input {...fieldProps} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Alex Morgan" />}
      </FormField>
      <FormField label="Email" required error={errors.email?.[0]} inputId="user-email">
        {(fieldProps) => <div className="input-with-icon"><Mail size={18} aria-hidden="true" /><input {...fieldProps} type="email" autoComplete="off" value={form.email} onChange={(event) => update('email', event.target.value)} placeholder="name@company.com" /></div>}
      </FormField>
      <FormField label={record ? 'New password' : 'Temporary password'} required={!record} error={errors.password?.[0]} inputId="user-password" hint={record ? 'Leave blank to keep the current password.' : 'The user can change this later.'}>
        {(fieldProps) => <input {...fieldProps} type="password" autoComplete="new-password" value={form.password} onChange={(event) => update('password', event.target.value)} />}
      </FormField>
      <FormField label="Department" required error={errors.department_id?.[0]} inputId="user-department">
        {(fieldProps) => <select {...fieldProps} value={form.departmentId} onChange={(event) => update('departmentId', event.target.value)}><option value="">Select department</option>{departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select>}
      </FormField>
      <FormField label="Designation" error={errors.designation?.[0]} inputId="user-designation">
        {(fieldProps) => <input {...fieldProps} value={form.designation} onChange={(event) => update('designation', event.target.value)} placeholder="Job title" />}
      </FormField>
      <FormField label="Role" required error={errors.role?.[0]} inputId="user-role">
        {(fieldProps) => <select {...fieldProps} value={form.role} onChange={(event) => update('role', event.target.value)}>{userRoleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>}
      </FormField>
      <FormField label="Status" required error={errors.status?.[0]} inputId="user-status">
        {(fieldProps) => <select {...fieldProps} value={form.status} onChange={(event) => update('status', event.target.value)}>{userStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>}
      </FormField>
    </div></form>
  </Modal>
}

export default function AdminUsersPage() {
  const { notify } = useToast()
  const options = useSupportOptions()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [records, setRecords] = useState<User[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<User | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('')
    try { const response = await get<Paginated<User>>('/v1/users', { params: { search: debouncedSearch || undefined, role: role || undefined, per_page: 15, page, sort_by: 'name', sort_direction: 'asc' }, signal }); setRecords(listData(response)); setMeta(paginationFrom(response, page)) }
    catch (requestError: unknown) { if (!shouldIgnoreRequest(requestError)) setError(getErrorMessage(requestError)) }
    finally { if (!signal?.aborted) setLoading(false) }
  }, [debouncedSearch, page, role])
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load, reloadKey])

  const saved = (message: string) => { setEditing(undefined); notify(message); setReloadKey((value) => value + 1) }
  const confirmDelete = async () => { if (!deleteTarget) return; setDeleteBusy(true); try { await destroy(`/v1/users/${deleteTarget.id}`); notify(`${deleteTarget.name} was deleted.`); setDeleteTarget(null); setReloadKey((value) => value + 1) } catch (requestError: unknown) { notify(getErrorMessage(requestError), 'error') } finally { setDeleteBusy(false) } }

  return <div className="page-stack">
    <PageHeader eyebrow="Administration" title="Users" description="Manage user access, department membership, and support roles." actions={<Button onClick={() => setEditing(null)}><Plus size={18} aria-hidden="true" />Add user</Button>} />
    <Panel className="admin-toolbar"><div className="resource-search"><label htmlFor="user-search">Search users</label><div className="input-with-icon"><Search size={18} aria-hidden="true" /><input id="user-search" type="search" value={search} placeholder="Name or email…" onChange={(event) => { setSearch(event.target.value); setPage(1) }} />{search && <IconButton label="Clear search" onClick={() => setSearch('')}><X size={17} aria-hidden="true" /></IconButton>}</div></div><div className="filter-field admin-role-filter"><label htmlFor="user-role-filter">Role</label><select id="user-role-filter" value={role} onChange={(event) => { setRole(event.target.value); setPage(1) }}><option value="">All roles</option>{userRoleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div><p>{loading ? 'Loading…' : `${formatNumber(meta.total)} ${meta.total === 1 ? 'user' : 'users'}`}</p></Panel>
    {loading ? <Skeleton count={7} /> : error ? <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : records.length === 0 ? <EmptyState title="No users found" message={search || role ? 'Try changing the search or role filter.' : 'Add the first user to give people access.'} action={<Button onClick={() => setEditing(null)}><Plus size={18} aria-hidden="true" />Add user</Button>} /> : <>
      <div className="table-card desktop-only"><div className="table-scroll"><table className="data-table"><caption className="sr-only">Users</caption><thead><tr><th scope="col">User</th><th scope="col">Department</th><th scope="col">Role</th><th scope="col">Designation</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{records.map((record) => <tr key={record.id}><td><div className="entity-cell"><span className="entity-cell__icon"><UserRound size={19} aria-hidden="true" /></span><span><strong>{record.name}</strong><small>{record.email}</small></span></div></td><td>{record.department?.name || 'Unassigned'}</td><td><span className="role-label"><ShieldCheck size={15} aria-hidden="true" />{titleCase(record.role)}</span></td><td>{record.designation || '—'}</td><td><StatusBadge value={record.status} /></td><td><div className="row-actions"><IconButton label={`Edit ${record.name}`} onClick={() => setEditing(record)}><Edit3 size={18} aria-hidden="true" /></IconButton><IconButton label={`Delete ${record.name}`} onClick={() => setDeleteTarget(record)}><Trash2 size={18} aria-hidden="true" /></IconButton></div></td></tr>)}</tbody></table></div></div>
      <div className="mobile-records mobile-only">{records.map((record) => <article className="record-card" key={record.id}><div className="record-card__header"><div className="entity-cell"><span className="entity-cell__icon"><UserRound size={19} aria-hidden="true" /></span><span><strong>{record.name}</strong><small>{record.email}</small></span></div><StatusBadge value={record.status} /></div><dl className="record-card__details"><div><dt>Department</dt><dd>{record.department?.name || 'Unassigned'}</dd></div><div><dt>Role</dt><dd>{titleCase(record.role)}</dd></div><div><dt>Designation</dt><dd>{record.designation || '—'}</dd></div></dl><div className="record-card__actions"><Button variant="secondary" size="small" onClick={() => setEditing(record)}><Edit3 size={17} aria-hidden="true" />Edit</Button><Button variant="ghost" size="small" onClick={() => setDeleteTarget(record)}><Trash2 size={17} aria-hidden="true" />Delete</Button></div></article>)}</div>
      <Pagination page={meta.current_page} lastPage={meta.last_page} total={meta.total} busy={loading} onPageChange={setPage} />
    </>}
    {editing !== undefined && <UserDialog record={editing} departments={options.departments} onClose={() => setEditing(undefined)} onSaved={saved} />}
    <ConfirmDialog open={Boolean(deleteTarget)} title="Delete this user?" message={`${deleteTarget?.name || 'This user'} may be linked to support logs and assignments. This action cannot be undone.`} busy={deleteBusy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
  </div>
}
