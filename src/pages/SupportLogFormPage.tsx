import {
  ArrowLeft,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Info,
  Save,
  ShieldCheck,
  Tags,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSupportOptions } from '../hooks/useSupportOptions'
import { useToast } from '../hooks/useToast'
import {
  Button,
  ErrorState,
  FormErrorSummary,
  FormField,
  LoadingState,
  PageHeader,
  Panel,
  SectionHeading,
} from '../components/ui'
import { get, getErrorMessage, getFieldErrors, post, put, shouldIgnoreRequest } from '../lib/api'
import { supportPriorityOptions, supportStatusOptions } from '../lib/constants'
import { todayIso } from '../lib/format'
import { entityId, unwrapResource } from '../lib/support'
import type { EntityId, FieldErrors, SupportLog, SupportPriority, SupportStatus } from '../types'

interface SupportLogFormState {
  issueDate: string
  initiatedBy: string
  departmentId: EntityId | ''
  issueTypes: EntityId[]
  itemTypeId: EntityId | ''
  description: string
  status: SupportStatus
  priority: SupportPriority
  assignedTo: EntityId | ''
  resolutionNotes: string
  internalRemarks: string
}

const emptyForm: SupportLogFormState = {
  issueDate: todayIso(),
  initiatedBy: '',
  departmentId: '',
  issueTypes: [],
  itemTypeId: '',
  description: '',
  status: 'open',
  priority: 'medium',
  assignedTo: '',
  resolutionNotes: '',
  internalRemarks: '',
}

function fieldError(errors: FieldErrors, field: string): string | undefined {
  return errors[field]?.[0] || errors[`${field}.0`]?.[0]
}

export default function SupportLogFormPage() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useToast()
  const canEditDetails = !isEditing || user?.role === 'admin'
  const options = useSupportOptions()
  const summaryRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<SupportLogFormState>(() => ({
    ...emptyForm,
    initiatedBy: user?.name ?? '',
    departmentId: user?.department_id ?? '',
  }))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(isEditing)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isEditing) return
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')
    void get<SupportLog | { data: SupportLog }>(`/v1/support-logs/${id}`, { signal: controller.signal })
      .then((response) => {
        const log = unwrapResource(response)
        const selectedDepartment = log.department_id ?? ''
        setForm({
          issueDate: log.issue_date?.slice(0, 10) || todayIso(),
          initiatedBy: log.initiated_by || '',
          departmentId: selectedDepartment,
          issueTypes: Array.isArray(log.issue_types) ? log.issue_types.map((value) => entityId(value)).filter((value): value is EntityId => value !== undefined) : [],
          itemTypeId: log.item_type_id ?? entityId(log.item_type) ?? '',
          description: log.description || '',
          status: supportStatusOptions.some((option) => option.value === log.status) ? log.status as SupportStatus : 'open',
          priority: supportPriorityOptions.some((option) => option.value === log.priority) ? log.priority as SupportPriority : 'medium',
          assignedTo: entityId(log.assigned_to) ?? '',
          resolutionNotes: log.resolution_notes || '',
          internalRemarks: log.internal_remarks || '',
        })
      })
      .catch((error: unknown) => {
        if (!shouldIgnoreRequest(error)) setLoadError(getErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [id, isEditing, reloadKey])

  const clearError = (field: string) => {
    setErrors((current) => {
      if (!current[field] && !current[`${field}.0`]) return current
      const next = { ...current }
      delete next[field]
      delete next[`${field}.0`]
      return next
    })
  }

  const updateField = <Key extends keyof SupportLogFormState>(field: Key, value: SupportLogFormState[Key], errorField = field as string) => {
    setForm((current) => ({ ...current, [field]: value }))
    clearError(errorField)
  }

  const toggleIssueType = (value: EntityId, checked: boolean) => {
    setForm((current) => ({
      ...current,
      issueTypes: checked
        ? [...current.issueTypes, value]
        : current.issueTypes.filter((item) => String(item) !== String(value)),
    }))
    clearError('issue_types')
  }

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {}
    if (!form.issueDate) nextErrors.issue_date = ['Enter the issue date.']
    else if (form.issueDate > todayIso()) nextErrors.issue_date = ['Issue date cannot be in the future.']
    if (!form.initiatedBy.trim()) nextErrors.initiated_by = ['Enter the name of the person who initiated this request.']
    if (!form.departmentId) nextErrors.department_id = ['Select the department.']
    if (form.issueTypes.length === 0) nextErrors.issue_types = ['Select at least one issue type.']
    if (!form.itemTypeId) nextErrors.item_type_id = ['Select the item type.']
    if (!form.description.trim()) nextErrors.description = ['Describe the support issue.']
    else if (form.description.trim().length < 10) nextErrors.description = ['Add at least 10 characters so the issue is clear.']
    if (!form.status) nextErrors.status = ['Select the current status.']
    if (!form.priority) nextErrors.priority = ['Select a priority.']
    if (['resolved', 'closed'].includes(form.status) && !form.resolutionNotes.trim()) {
      nextErrors.resolution_notes = ['Add resolution notes before marking this log resolved or closed.']
    }
    return nextErrors
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    const validation = validate()
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      setFormError('')
      window.requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setSubmitting(true)
    setErrors({})
    setFormError('')
    const payload = canEditDetails
      ? {
          issue_date: form.issueDate,
          initiated_by: form.initiatedBy.trim(),
          department_id: form.departmentId,
          issue_types: form.issueTypes,
          item_type_id: form.itemTypeId,
          description: form.description.trim(),
          status: form.status,
          priority: form.priority,
          assigned_to: form.assignedTo || null,
          resolution_notes: form.resolutionNotes.trim() || null,
          internal_remarks: form.internalRemarks.trim() || null,
        }
      : {
          status: form.status,
          resolution_notes: form.resolutionNotes.trim() || null,
          internal_remarks: form.internalRemarks.trim() || null,
        }
    try {
      if (id) await put(`/v1/support-logs/${id}`, payload)
      else await post('/v1/support-logs', payload)
      notify(isEditing ? 'Support log updated successfully.' : 'Support log created successfully.')
      navigate(isEditing ? `/support-logs/${id}` : '/support-logs')
    } catch (error: unknown) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : getErrorMessage(error))
      window.requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Loading support log form" />
  if (loadError) return <ErrorState message={loadError} onRetry={() => setReloadKey((value) => value + 1)} />

  const assignableUsers = options.users.filter((candidate) => candidate.status !== 'inactive' && (candidate.role === 'technical_resource' || candidate.role === 'admin'))
  const activeIssueTypes = options.issueTypes.filter((issueType) => issueType.status !== 'inactive' || (isEditing && form.issueTypes.some((value) => String(value) === String(issueType.id))))
  const activeItemTypes = options.itemTypes.filter((itemType) => itemType.status !== 'inactive' || (isEditing && String(form.itemTypeId) === String(itemType.id)))

  return (
    <div className="page-stack form-page">
      <PageHeader
        eyebrow="Service workflow"
        title={isEditing ? 'Edit support log' : 'Create support log'}
        description="Capture the request context, ownership, and resolution path in one auditable record."
        actions={<Link className="button button--secondary button--default" to={isEditing ? `/support-logs/${id}` : '/support-logs'}><ArrowLeft size={18} aria-hidden="true" />Back to support logs</Link>}
      />

      {options.error && <div className="notice-banner" role="status"><Info size={20} aria-hidden="true" /><div><strong>Some form options could not load</strong><p>{options.error}</p></div><Button variant="secondary" size="small" onClick={options.reload}>Retry options</Button></div>}
      {!canEditDetails && <div className="notice-banner" role="status"><ShieldCheck size={20} aria-hidden="true" /><div><strong>Assigned-work update</strong><p>Technical resources can update status, resolution notes, and internal remarks. Request details and assignment are managed by an administrator.</p></div></div>}
      {formError && <div className="form-error-summary" role="alert"><Info size={20} aria-hidden="true" /><div><strong>Unable to save this support log</strong><p>{formError}</p></div></div>}
      <FormErrorSummary errors={errors} ref={summaryRef} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-layout">
          <div className="form-layout__main">
            <Panel>
              <SectionHeading title="Request details" description="Identify who reported the issue and where it belongs." />
              <div className="form-grid form-grid--two">
                <FormField label="Issue date" required error={fieldError(errors, 'issue_date')} inputId="issue_date">
                  {(fieldProps) => <div className="input-with-icon"><CalendarDays size={18} aria-hidden="true" /><input {...fieldProps} type="date" max={todayIso()} disabled={!canEditDetails} value={form.issueDate} onChange={(event) => updateField('issueDate', event.target.value)} /></div>}
                </FormField>
                <FormField label="Initiated by" required error={fieldError(errors, 'initiated_by')} inputId="initiated_by" hint="Enter the requester's name as it should appear in the log.">
                  {(fieldProps) => <div className="input-with-icon"><UserRound size={18} aria-hidden="true" /><input {...fieldProps} disabled={!canEditDetails} value={form.initiatedBy} onChange={(event) => updateField('initiatedBy', event.target.value)} placeholder="e.g. Jordan Lee" autoComplete="name" /></div>}
                </FormField>
                <FormField label="Department" required error={fieldError(errors, 'department_id')} inputId="department_id" hint="Select the organizational home for this request.">
                  {(fieldProps) => <select {...fieldProps} disabled={!canEditDetails} value={form.departmentId} onChange={(event) => updateField('departmentId', event.target.value)}><option value="">Select department</option>{options.departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select>}
                </FormField>
                <FormField label="Item type" required error={fieldError(errors, 'item_type_id')} inputId="item_type_id">
                  {(fieldProps) => <select {...fieldProps} disabled={!canEditDetails} value={form.itemTypeId} onChange={(event) => updateField('itemTypeId', event.target.value)}><option value="">Select item type</option>{activeItemTypes.map((itemType) => <option value={itemType.id} key={itemType.id}>{itemType.name}</option>)}</select>}
                </FormField>
                <FormField label="Description" required error={fieldError(errors, 'description')} inputId="description" className="form-grid__full" hint="Describe the symptom, impact, and any useful troubleshooting context.">
                  {(fieldProps) => <textarea {...fieldProps} rows={6} disabled={!canEditDetails} value={form.description} onChange={(event) => updateField('description', event.target.value)} placeholder="What is happening, and what support is needed?" />}
                </FormField>
              </div>
            </Panel>

            <Panel>
              <SectionHeading title="Classification and ownership" description="Use consistent categories so reports remain useful to the whole team." />
              <fieldset id="issue_types" className="choice-fieldset support-issue-types" aria-describedby={fieldError(errors, 'issue_types') ? 'issue_types-error' : undefined}>
                <legend>Issue types <span className="required-mark" aria-hidden="true">*</span><span className="sr-only"> (required)</span></legend>
                {activeIssueTypes.length === 0 ? <p className="text-muted">No active issue types are available.</p> : <div className="choice-grid choice-grid--two">{activeIssueTypes.map((issueType) => { const selected = form.issueTypes.some((value) => String(value) === String(issueType.id)); return <label className={selected ? 'choice-card choice-card--selected' : 'choice-card'} key={issueType.id}><input type="checkbox" value={issueType.id} disabled={!canEditDetails} checked={selected} onChange={(event) => toggleIssueType(issueType.id, event.target.checked)} /><span className="choice-card__icon" aria-hidden="true"><Tags size={21} /></span><span><strong>{issueType.name}</strong><small>{issueType.description || 'Support issue category'}</small></span></label> })}</div>}
                {fieldError(errors, 'issue_types') && <p className="form-field__error" id="issue_types-error">{fieldError(errors, 'issue_types')}</p>}
              </fieldset>
              <div className="form-grid form-grid--two">
                <FormField label="Status" required error={fieldError(errors, 'status')} inputId="status" hint={!isEditing && user?.role !== 'admin' ? 'New technical-resource logs start in Open status.' : undefined}>
                  {(fieldProps) => <select {...fieldProps} disabled={!isEditing && user?.role !== 'admin'} value={form.status} onChange={(event) => updateField('status', event.target.value as SupportStatus)}>{supportStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>}
                </FormField>
                <FormField label="Priority" required error={fieldError(errors, 'priority')} inputId="priority">
                  {(fieldProps) => <select {...fieldProps} disabled={!canEditDetails} value={form.priority} onChange={(event) => updateField('priority', event.target.value as SupportPriority)}>{supportPriorityOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>}
                </FormField>
                <FormField label="Assigned resource" error={fieldError(errors, 'assigned_to')} inputId="assigned_to" hint="Leave unassigned when the request is still being triaged.">
                  {(fieldProps) => <div className="input-with-icon"><UsersRound size={18} aria-hidden="true" /><select {...fieldProps} disabled={!canEditDetails} value={form.assignedTo} onChange={(event) => updateField('assignedTo', event.target.value)}><option value="">Unassigned</option>{assignableUsers.map((candidate) => <option value={candidate.id} key={candidate.id}>{candidate.name}</option>)}</select></div>}
                </FormField>
              </div>
            </Panel>

            <Panel>
              <SectionHeading title="Resolution and context" description="Keep customer-facing resolution details separate from internal remarks." />
              <div className="form-grid form-grid--two">
                <FormField label="Resolution notes" error={fieldError(errors, 'resolution_notes')} inputId="resolution_notes" className="form-grid__full" hint="Required when status is Resolved or Closed.">
                  {(fieldProps) => <textarea {...fieldProps} rows={5} value={form.resolutionNotes} onChange={(event) => updateField('resolutionNotes', event.target.value)} placeholder="Summarize the fix, outcome, or handoff…" />}
                </FormField>
                <FormField label="Internal remarks" error={fieldError(errors, 'internal_remarks')} inputId="internal_remarks" className="form-grid__full" hint="Optional context for the support team; handle sensitive information appropriately.">
                  {(fieldProps) => <textarea {...fieldProps} rows={5} value={form.internalRemarks} onChange={(event) => updateField('internalRemarks', event.target.value)} placeholder="Add internal follow-up or coordination notes…" />}
                </FormField>
              </div>
            </Panel>
          </div>

          <aside className="form-layout__aside">
            <Panel className="form-help-card form-progress-card">
              <span aria-hidden="true"><ClipboardCheck size={24} /></span>
              <p className="eyebrow">Record checklist</p>
              <h2>Complete the request</h2>
              <ol>
                <li className={form.initiatedBy && form.departmentId ? 'complete' : ''}><span>1</span> Link the initiator and department</li>
                <li className={form.issueTypes.length > 0 && form.itemTypeId ? 'complete' : ''}><span>2</span> Classify the request</li>
                <li className={form.description.trim().length >= 10 ? 'complete' : ''}><span>3</span> Describe the issue clearly</li>
                <li className={form.assignedTo ? 'complete' : ''}><span>4</span> Route an owner when ready</li>
              </ol>
            </Panel>
            <Panel className="form-help-card">
              <span aria-hidden="true"><ShieldCheck size={23} /></span>
              <h2>Good records help</h2>
              <p>Use a specific description, select every applicable issue type, and keep resolution notes current as work progresses.</p>
            </Panel>
            <Panel className="form-help-card">
              <span aria-hidden="true"><FileText size={23} /></span>
              <h2>Need the full record?</h2>
              <p>Open a support log to review its complete history and assignment timeline.</p>
              <Link className="text-link" to="/support-logs">Browse support logs</Link>
            </Panel>
          </aside>
        </div>

        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate(isEditing ? `/support-logs/${id}` : '/support-logs')} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting} disabled={submitting}><Save size={18} aria-hidden="true" />{isEditing ? 'Save changes' : 'Create support log'}</Button>
        </div>
      </form>
    </div>
  )
}
