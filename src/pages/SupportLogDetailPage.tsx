import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Edit3,
  FileClock,
  History,
  Info,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSupportOptions } from '../hooks/useSupportOptions'
import { useToast } from '../hooks/useToast'
import {
  Button,
  ConfirmDialog,
  ErrorState,
  LoadingState,
  PageHeader,
  Panel,
  PriorityBadge,
  SectionHeading,
  StatusBadge,
} from '../components/ui'
import { destroy, get, getErrorMessage, shouldIgnoreRequest } from '../lib/api'
import { formatDate, formatDateTime } from '../lib/format'
import { canDeleteSupportLog, canEditSupportLog, departmentName, itemTypeName, issueTypeNames, referenceName, unwrapResource } from '../lib/support'
import type { SupportLog, SupportLogAssignment } from '../types'

function assignmentLabel(assignment: SupportLogAssignment): string {
  return referenceName(assignment.assigned_resource, '') || referenceName(assignment.assigned_to || assignment.user, 'Unassigned')
}

export default function SupportLogDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { notify } = useToast()
  const options = useSupportOptions()
  const [log, setLog] = useState<SupportLog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const loadLog = useCallback(async (signal?: AbortSignal) => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const response = await get<SupportLog | { data: SupportLog }>(`/v1/support-logs/${id}`, { signal })
      setLog(unwrapResource(response))
    } catch (requestError: unknown) {
      if (!shouldIgnoreRequest(requestError)) setError(getErrorMessage(requestError))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [id])

  useEffect(() => {
    const controller = new AbortController()
    void loadLog(controller.signal)
    return () => controller.abort()
  }, [loadLog, reloadKey])

  const confirmDelete = async () => {
    if (!log) return
    setDeleteBusy(true)
    try {
      await destroy(`/v1/support-logs/${log.id}`)
      notify(`Support log ${log.ticket_number} was archived.`)
      navigate('/support-logs', { replace: true })
    } catch (requestError: unknown) {
      notify(getErrorMessage(requestError), 'error')
    } finally {
      setDeleteBusy(false)
    }
  }

  if (loading) return <LoadingState label="Loading support log" />
  if (error) return <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
  if (!log) return <ErrorState message="This support log could not be found." />

  const assignments = log.assignments || []
  const issueTypes = issueTypeNames(log.issue_types, options.issueTypes)
  const initiatorName = referenceName(log.initiated_by, 'Unknown user')
  const assignedName = referenceName(log.assigned_resource, '') || referenceName(log.assigned_to, 'Unassigned')
  const createdByName = log.creator ? referenceName(log.creator, 'Unknown user') : referenceName(log.created_by, 'Unknown user')
  const canEdit = canEditSupportLog(user, log)
  const canDelete = canDeleteSupportLog(user)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Support record"
        title={log.ticket_number}
        description={`Created ${formatDateTime(log.created_at)}${log.updated_at ? ` · Last updated ${formatDateTime(log.updated_at)}` : ''}`}
        actions={<><Link className="button button--secondary button--default" to="/support-logs"><ArrowLeft size={18} aria-hidden="true" />Back to logs</Link>{canEdit && <Link className="button button--primary button--default" to={`/support-logs/${log.id}/edit`}><Edit3 size={18} aria-hidden="true" />Edit log</Link>}{canDelete && <Button variant="danger" onClick={() => setShowDelete(true)}><Trash2 size={18} aria-hidden="true" />Archive</Button>}</>}
      />

      <div className="detail-status-strip">
        <div><span className="eyebrow">Current status</span><StatusBadge value={log.status} /></div>
        <div><span className="eyebrow">Priority</span><PriorityBadge value={log.priority} /></div>
        <div><span className="eyebrow">Assigned resource</span><strong>{assignedName}</strong></div>
        <div><span className="eyebrow">Department</span><strong>{departmentName(log.department)}</strong></div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <Panel className="detail-panel">
            <SectionHeading title="Request overview" description="The core context for this support request." />
            <dl className="detail-list">
              <div><dt>Ticket number</dt><dd><strong>{log.ticket_number}</strong></dd></div>
              <div><dt>Issue date</dt><dd>{formatDate(log.issue_date)}</dd></div>
              <div><dt>Initiated by</dt><dd>{initiatorName}</dd></div>
              <div><dt>Department</dt><dd>{departmentName(log.department)}</dd></div>
              <div><dt>Issue types</dt><dd>{issueTypes.length > 0 ? issueTypes.join(', ') : 'No issue types recorded'}</dd></div>
              <div><dt>Item type</dt><dd>{itemTypeName(log.item_type, 'No item type recorded')}</dd></div>
            </dl>
            <div className="detail-copy"><h3>Description</h3><p>{log.description || 'No description recorded.'}</p></div>
          </Panel>

          <Panel className="detail-panel">
            <SectionHeading title="Resolution and notes" description="Separate customer-facing outcome from internal context." />
            <div className="detail-note detail-note--resolution"><div className="detail-note__heading"><CheckCircle2 size={19} aria-hidden="true" /><h3>Resolution notes</h3></div><p>{log.resolution_notes || 'No resolution notes have been added yet.'}</p></div>
            <div className="detail-note detail-note--internal"><div className="detail-note__heading"><Info size={19} aria-hidden="true" /><h3>Internal remarks</h3></div><p>{log.internal_remarks || 'No internal remarks have been added yet.'}</p></div>
            <dl className="detail-list detail-list--compact"><div><dt>Resolved at</dt><dd>{formatDateTime(log.resolved_at)}</dd></div><div><dt>Closed at</dt><dd>{formatDateTime(log.closed_at)}</dd></div></dl>
          </Panel>
        </div>

        <aside className="detail-aside">
          <Panel className="detail-panel">
            <SectionHeading title="Record metadata" />
            <dl className="detail-list detail-list--stacked"><div><dt>Created by</dt><dd>{createdByName}</dd></div><div><dt>Created at</dt><dd>{formatDateTime(log.created_at)}</dd></div><div><dt>Updated at</dt><dd>{formatDateTime(log.updated_at)}</dd></div><div><dt>Record ID</dt><dd><code>{String(log.id)}</code></dd></div></dl>
          </Panel>
          <Panel className="detail-panel">
            <SectionHeading title="Assignment history" description="Assignment changes recorded for this request." />
            {assignments.length === 0 ? <div className="detail-empty"><History size={22} aria-hidden="true" /><p>No assignment history has been recorded.</p></div> : <ol className="assignment-list">{assignments.map((assignment, index) => <li key={String(assignment.id ?? index)}><span className="assignment-list__marker" aria-hidden="true"><FileClock size={16} /></span><div><strong>{assignmentLabel(assignment)}</strong><p>{assignment.notes || 'Assignment recorded'}</p><small>{formatDateTime(assignment.assigned_at || assignment.created_at)}</small></div></li>)}</ol>}
          </Panel>
          <Panel className="form-help-card"><span aria-hidden="true"><CalendarDays size={23} /></span><h2>Keep it current</h2><p>Update the status, owner, and resolution notes as the request progresses.</p>{canEdit && <Link className="text-link" to={`/support-logs/${log.id}/edit`}>Edit this support log</Link>}</Panel>
        </aside>
      </div>

      <ConfirmDialog open={showDelete} title="Archive this support log?" message={`Support log ${log.ticket_number} will be hidden from the active queue but retained in historical data.`} busy={deleteBusy} onCancel={() => setShowDelete(false)} onConfirm={() => void confirmDelete()} />
    </div>
  )
}
