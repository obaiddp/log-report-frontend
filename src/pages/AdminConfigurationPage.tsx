import { Edit3, ListChecks, Plus, Settings2, Tags, Trash2 } from 'lucide-react'
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
  Panel,
  Skeleton,
  StatusBadge,
} from '../components/ui'
import { destroy, get, getErrorMessage, getFieldErrors, post, put } from '../lib/api'
import { userStatusOptions } from '../lib/constants'
import { listData } from '../lib/support'
import type { FieldErrors, IssueType, ItemType, Paginated } from '../types'

type OptionKind = 'issue-types' | 'item-types'
type OptionRecord = IssueType | ItemType

interface OptionFormState { name: string; description: string; status: string }
const emptyForm: OptionFormState = { name: '', description: '', status: 'active' }

function ConfigurationDialog({ kind, record, onClose, onSaved }: { kind: OptionKind; record: OptionRecord | null; onClose: () => void; onSaved: (message: string) => void }) {
  const singular = kind === 'issue-types' ? 'issue type' : 'item type'
  const [form, setForm] = useState<OptionFormState>(() => record ? { name: record.name, description: record.description || '', status: record.status || 'active' } : emptyForm)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const summaryRef = useRef<HTMLDivElement>(null)
  const update = (field: keyof OptionFormState, value: string) => { setForm((current) => ({ ...current, [field]: value })); setErrors((current) => { if (!current[field]) return current; const next = { ...current }; delete next[field]; return next }) }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form.name.trim()) { setErrors({ name: [`Enter an ${singular} name.`] }); window.requestAnimationFrame(() => summaryRef.current?.focus()); return }
    setSubmitting(true); setErrors({}); setFormError('')
    const payload = { name: form.name.trim(), description: form.description.trim() || null, status: form.status }
    try { if (record) await put(`/v1/${kind}/${record.id}`, payload); else await post(`/v1/${kind}`, payload); onSaved(`${form.name.trim()} was ${record ? 'updated' : 'created'}.`) }
    catch (error: unknown) { const fieldErrors = getFieldErrors(error); setErrors(fieldErrors); setFormError(Object.keys(fieldErrors).length > 0 ? '' : getErrorMessage(error)); window.requestAnimationFrame(() => summaryRef.current?.focus()) }
    finally { setSubmitting(false) }
  }
  return <Modal open title={`${record ? 'Edit' : 'Add'} ${singular}`} description="Keep the options used on support log forms consistent." onClose={onClose} footer={<><Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button><Button type="submit" form="configuration-form" loading={submitting}>{record ? 'Save changes' : `Create ${singular}`}</Button></>}>
    {formError && <div className="form-error-summary" role="alert"><strong>Unable to save this {singular}</strong><p>{formError}</p></div>}
    <FormErrorSummary errors={errors} ref={summaryRef} />
    <form id="configuration-form" className="form-stack" onSubmit={submit} noValidate>
      <FormField label="Name" required error={errors.name?.[0]} inputId="option-name">
        {(fieldProps) => <input {...fieldProps} value={form.name} onChange={(event) => update('name', event.target.value)} placeholder={`e.g. ${kind === 'issue-types' ? 'Network access' : 'Laptop'}`} />}
      </FormField>
      <FormField label="Description" error={errors.description?.[0]} inputId="option-description">
        {(fieldProps) => <textarea {...fieldProps} rows={4} value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Optional description for the support team" />}
      </FormField>
      <FormField label="Status" required error={errors.status?.[0]} inputId="option-status">
        {(fieldProps) => <select {...fieldProps} value={form.status} onChange={(event) => update('status', event.target.value)}>{userStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>}
      </FormField>
    </form>
  </Modal>
}

function OptionList({ kind, records, loading, error, onAdd, onEdit, onDelete, onRetry }: { kind: OptionKind; records: OptionRecord[]; loading: boolean; error: string; onAdd: () => void; onEdit: (record: OptionRecord) => void; onDelete: (record: OptionRecord) => void; onRetry: () => void }) {
  const singular = kind === 'issue-types' ? 'issue type' : 'item type'
  return <Panel className="configuration-panel"><div className="configuration-panel__header"><div><p className="eyebrow">Options</p><h2>{kind === 'issue-types' ? 'Issue types' : 'Item types'}</h2><p>Active options appear in support log forms.</p></div><Button size="small" onClick={onAdd}><Plus size={17} aria-hidden="true" />Add {singular}</Button></div>{loading ? <Skeleton count={4} /> : error ? <ErrorState compact message={error} onRetry={onRetry} /> : records.length === 0 ? <EmptyState title={`No ${kind === 'issue-types' ? 'issue types' : 'item types'}`} message={`Add the first ${singular} to make it available on support requests.`} action={<Button size="small" onClick={onAdd}><Plus size={17} aria-hidden="true" />Add {singular}</Button>} /> : <div className="option-list">{records.map((record) => <article className="option-row" key={record.id}><span className="option-row__icon" aria-hidden="true">{kind === 'issue-types' ? <Tags size={19} /> : <ListChecks size={19} />}</span><span className="option-row__copy"><strong>{record.name}</strong><small>{record.description || `No description`}</small></span><StatusBadge value={record.status} /><span className="row-actions"><IconButton label={`Edit ${record.name}`} onClick={() => onEdit(record)}><Edit3 size={17} aria-hidden="true" /></IconButton><IconButton label={`Delete ${record.name}`} onClick={() => onDelete(record)}><Trash2 size={17} aria-hidden="true" /></IconButton></span></article>)}</div>}</Panel>
}

export default function AdminConfigurationPage() {
  const { notify } = useToast()
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([])
  const [itemTypes, setItemTypes] = useState<ItemType[]>([])
  const [issueLoading, setIssueLoading] = useState(true)
  const [itemLoading, setItemLoading] = useState(true)
  const [issueError, setIssueError] = useState('')
  const [itemError, setItemError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [editing, setEditing] = useState<{ kind: OptionKind; record: OptionRecord | null } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ kind: OptionKind; record: OptionRecord } | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const load = useCallback(async (signal?: AbortSignal) => {
    setIssueLoading(true); setItemLoading(true); setIssueError(''); setItemError('')
    const [issues, items] = await Promise.allSettled([
      get<Paginated<IssueType>>('/v1/issue-types', { params: { per_page: 100, sort_by: 'name', sort_direction: 'asc' }, signal }),
      get<Paginated<ItemType>>('/v1/item-types', { params: { per_page: 100, sort_by: 'name', sort_direction: 'asc' }, signal }),
    ])
    if (signal?.aborted) return
    if (issues.status === 'fulfilled') setIssueTypes(listData(issues.value)); else setIssueError(getErrorMessage(issues.reason)); setIssueLoading(false)
    if (items.status === 'fulfilled') setItemTypes(listData(items.value)); else setItemError(getErrorMessage(items.reason)); setItemLoading(false)
  }, [])
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [load, reloadKey])

  const saved = (message: string) => { setEditing(null); notify(message); setReloadKey((value) => value + 1) }
  const confirmDelete = async () => { if (!deleteTarget) return; setDeleteBusy(true); try { await destroy(`/v1/${deleteTarget.kind}/${deleteTarget.record.id}`); notify(`${deleteTarget.record.name} was deleted.`); setDeleteTarget(null); setReloadKey((value) => value + 1) } catch (requestError: unknown) { notify(getErrorMessage(requestError), 'error') } finally { setDeleteBusy(false) } }

  return <div className="page-stack">
    <PageHeader eyebrow="Administration" title="Support configuration" description="Manage the issue types and item types used throughout the support log workflow." actions={<Settings2 size={22} aria-hidden="true" />} />
    <div className="configuration-grid"><OptionList kind="issue-types" records={issueTypes} loading={issueLoading} error={issueError} onAdd={() => setEditing({ kind: 'issue-types', record: null })} onEdit={(record) => setEditing({ kind: 'issue-types', record })} onDelete={(record) => setDeleteTarget({ kind: 'issue-types', record })} onRetry={() => setReloadKey((value) => value + 1)} /><OptionList kind="item-types" records={itemTypes} loading={itemLoading} error={itemError} onAdd={() => setEditing({ kind: 'item-types', record: null })} onEdit={(record) => setEditing({ kind: 'item-types', record })} onDelete={(record) => setDeleteTarget({ kind: 'item-types', record })} onRetry={() => setReloadKey((value) => value + 1)} /></div>
    {editing && <ConfigurationDialog kind={editing.kind} record={editing.record} onClose={() => setEditing(null)} onSaved={saved} />}
    <ConfirmDialog open={Boolean(deleteTarget)} title="Delete this option?" message={`${deleteTarget?.record.name || 'This option'} may be linked to existing support logs. This action cannot be undone.`} busy={deleteBusy} onCancel={() => setDeleteTarget(null)} onConfirm={() => void confirmDelete()} />
  </div>
}
