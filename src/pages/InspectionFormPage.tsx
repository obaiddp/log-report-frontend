import {
  ArrowLeft,
  Box,
  CalendarCheck2,
  ClipboardCheck,
  Info,
  Save,
  UserRoundCog,
  Wrench,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../hooks/useToast'
import {
  Button,
  ErrorState,
  FormErrorSummary,
  FormField,
  LoadingState,
  PageHeader,
  Panel,
  SearchableCombobox,
  SectionHeading,
} from '../components/ui'
import { get, getErrorMessage, getFieldErrors, post, put, shouldIgnoreRequest } from '../lib/api'
import {
  inspectionStatusOptions,
  repairSubCategoryOptions,
} from '../lib/constants'
import { formatDate, todayIso } from '../lib/format'
import type {
  Asset,
  EntityId,
  FieldErrors,
  Inspection,
  Paginated,
  TechnicalPersonnel,
  User,
} from '../types'

interface InspectionFormState {
  userLabel: string
  userId: EntityId | ''
  assetLabel: string
  assetId: EntityId | ''
  problemId: string
  inspectionDate: string
  category: 'new_purchase' | 'repair' | ''
  subCategory: '' | 'in_house' | 'out_house'
  status: string
  technicalPersonnelId: EntityId | ''
  remarks: string
}

const initialForm: InspectionFormState = {
  userLabel: '',
  userId: '',
  assetLabel: '',
  assetId: '',
  problemId: '',
  inspectionDate: todayIso(),
  category: '',
  subCategory: '',
  status: 'in_progress',
  technicalPersonnelId: '',
  remarks: '',
}

export default function InspectionFormPage() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { notify } = useToast()
  const summaryRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState(initialForm)
  const [users, setUsers] = useState<User[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [personnel, setPersonnel] = useState<TechnicalPersonnel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setLoadError('')

    const requests = Promise.all([
      get<Paginated<User>>('/v1/users', {
        params: { per_page: 100, sort_by: 'name', sort_direction: 'asc' },
        signal: controller.signal,
      }),
      get<Paginated<Asset>>('/v1/assets', {
        params: { per_page: 100, sort_by: 'asset_tag', sort_direction: 'asc' },
        signal: controller.signal,
      }),
      get<Paginated<TechnicalPersonnel>>('/v1/technical-personnel', {
        params: { per_page: 100, sort_by: 'name', sort_direction: 'asc' },
        signal: controller.signal,
      }),
    ])

    const inspectionRequest = id
      ? get<Inspection | { data: Inspection }>(`/v1/inspections/${id}`, {
          signal: controller.signal,
        }).then((response) => ('data' in response ? response.data : response))
      : Promise.resolve(null)

    void Promise.all([requests, inspectionRequest])
      .then(([resourceResponse, inspection]) => {
        const [userResponse, assetResponse, personnelResponse] = resourceResponse
        setUsers(userResponse.data ?? [])
        setAssets(assetResponse.data ?? [])
        setPersonnel(personnelResponse.data ?? [])
        if (inspection) {
          const category = inspection.category === 'repair' ? 'repair' : 'new_purchase'
          const subCategory =
            inspection.sub_category === 'in_house' || inspection.sub_category === 'out_house'
              ? inspection.sub_category
              : ''
          const status = inspectionStatusOptions.some(
            (option) => option.value === inspection.status,
          )
            ? inspection.status
            : 'in_progress'

          setForm({
            userLabel: inspection.user?.name ?? '',
            userId: inspection.user?.id ?? inspection.user_id ?? '',
            assetLabel: inspection.asset?.asset_tag ?? String(inspection.asset_id ?? ''),
            assetId: inspection.asset?.id ?? inspection.asset_id ?? '',
            problemId: inspection.problem_id ?? '',
            inspectionDate: inspection.inspection_date?.slice(0, 10) ?? '',
            category,
            subCategory,
            status,
            technicalPersonnelId:
              inspection.technical_personnel?.id ?? inspection.technical_personnel_id ?? '',
            remarks: inspection.remarks ?? '',
          })
        }
      })
      .catch((error: unknown) => {
        if (!shouldIgnoreRequest(error)) setLoadError(getErrorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [id, reloadKey])

  const clearError = (field: string) => {
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const updateField = <Key extends keyof InspectionFormState>(
    field: Key,
    value: InspectionFormState[Key],
    errorField = field as string,
  ) => {
    setForm((current) => ({ ...current, [field]: value }))
    clearError(errorField)
  }

  const handleUserChange = (value: string) => {
    const selected = users.find((user) => user.name.toLowerCase() === value.trim().toLowerCase())
    const selectedAsset = assets.find((asset) => asset.id === form.assetId)

    setForm((current) => ({
      ...current,
      userLabel: value,
      userId: selected?.id ?? '',
      assetId:
        selected && selectedAsset?.user?.id && selectedAsset.user.id !== selected.id
          ? ''
          : current.assetId,
      assetLabel:
        selected && selectedAsset?.user?.id && selectedAsset.user.id !== selected.id
          ? ''
          : current.assetLabel,
    }))
    clearError('user_id')
  }

  const handleAssetChange = (value: string) => {
    const selected = assets.find(
      (asset) => asset.asset_tag.toLowerCase() === value.trim().toLowerCase(),
    )

    setForm((current) => ({
      ...current,
      assetLabel: value,
      assetId: selected?.id ?? '',
      userId: selected?.user?.id ?? current.userId,
      userLabel: selected?.user?.name ?? current.userLabel,
    }))
    clearError('asset_id')
    clearError('user_id')
  }

  const handleCategoryChange = (category: 'new_purchase' | 'repair') => {
    setForm((current) => ({
      ...current,
      category,
      subCategory: '',
    }))
    clearError('category')
    clearError('sub_category')
  }

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {}
    if (!form.userId) nextErrors.user_id = ['Search for and select the assigned user.']
    if (!form.assetId) nextErrors.asset_id = ['Select the asset being inspected.']
    if (!form.problemId.trim()) nextErrors.problem_id = ['Enter the problem or tracking ID.']
    if (!form.inspectionDate) nextErrors.inspection_date = ['Enter the inspection date.']
    else if (form.inspectionDate > todayIso()) nextErrors.inspection_date = ['Inspection date cannot be in the future.']
    if (!form.category) nextErrors.category = ['Choose New Purchase or Repair.']
    if (form.category === 'repair' && !form.subCategory) {
      nextErrors.sub_category = ['Choose whether the repair is in-house or out-house.']
    }
    if (!form.status) nextErrors.status = ['Select the current inspection status.']
    if (!form.technicalPersonnelId) {
      nextErrors.technical_personnel_id = ['Assign a known technical person from the list.']
    }
    if (!form.remarks.trim()) nextErrors.remarks = ['Add remarks describing the inspection or work.']
    else if (form.remarks.trim().length < 10) {
      nextErrors.remarks = ['Add at least 10 characters so the record is meaningful.']
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

    const payload = {
      asset_id: form.assetId,
      problem_id: form.problemId.trim(),
      inspection_date: form.inspectionDate,
      category: form.category,
      sub_category: form.category === 'repair' ? form.subCategory : null,
      status: form.status,
      technical_personnel_id: form.technicalPersonnelId,
      remarks: form.remarks.trim(),
    }

    setSubmitting(true)
    setErrors({})
    setFormError('')
    try {
      if (id) await put(`/v1/inspections/${id}`, payload)
      else await post('/v1/inspections', payload)
      notify(isEditing ? 'Inspection updated successfully.' : 'Inspection created successfully.')
      navigate('/inspections')
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : getErrorMessage(error))
      window.requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Loading inspection form" />
  if (loadError) {
    return <ErrorState message={loadError} onRetry={() => setReloadKey((value) => value + 1)} />
  }

  return (
    <div className="page-stack form-page">
      <PageHeader
        eyebrow="Service workflow"
        title={isEditing ? 'Edit inspection record' : 'Asset inspection form'}
        description="Create a complete, auditable record connecting the user, asset, service need, and technical assignment."
        actions={
          <Link className="button button--secondary button--default" to="/inspections">
            <ArrowLeft size={18} aria-hidden="true" />
            Back to inspections
          </Link>
        }
      />

      {assets.length === 0 && (
        <div className="notice-banner notice-banner--warning" role="status">
          <Box size={20} aria-hidden="true" />
          <div>
            <strong>No assets are available</strong>
            <p>Register an asset before creating an inspection record.</p>
          </div>
          <Link className="button button--secondary button--small" to="/assets/new">Register asset</Link>
        </div>
      )}

      {formError && (
        <div className="form-error-summary" role="alert">
          <Info size={20} aria-hidden="true" />
          <div><strong>Unable to save this inspection</strong><p>{formError}</p></div>
        </div>
      )}
      <FormErrorSummary errors={errors} ref={summaryRef} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-layout">
          <div className="form-layout__main">
            <Panel>
              <SectionHeading title="Inspection target" description="Link this service event to an existing asset and its assigned user." />
              <div className="form-grid form-grid--two">
                <SearchableCombobox
                  inputId="user_id"
                  label="Assigned user"
                  required
                  value={form.userLabel}
                  onValueChange={handleUserChange}
                  options={users.map((user) => ({
                    id: user.id,
                    label: user.name,
                    description: `${user.email}${user.department?.name ? ` · ${user.department.name}` : ''}`,
                  }))}
                  error={errors.user_id?.[0]}
                  hint="Choose a name from the search suggestions."
                  autoComplete="off"
                />
                <SearchableCombobox
                  inputId="asset_id"
                  label="Asset"
                  required
                  value={form.assetLabel}
                  onValueChange={handleAssetChange}
                  options={assets.map((asset) => ({
                    id: asset.id,
                    label: asset.asset_tag,
                    description: `${asset.brand} ${asset.model} · ${asset.user?.name || 'Unassigned'}`,
                  }))}
                  error={errors.asset_id?.[0]}
                  hint="Search by asset tag, then choose a result."
                  placeholder="Search asset tag…"
                  disabled={assets.length === 0}
                  autoComplete="off"
                />
                <FormField label="Problem ID" required error={errors.problem_id?.[0]} inputId="problem_id" hint="Use the help desk, issue, or internal problem reference.">
                  {(fieldProps) => <input {...fieldProps} value={form.problemId} onChange={(event) => updateField('problemId', event.target.value)} placeholder="e.g. PRB-2026-0184" />}
                </FormField>
                <FormField label="Inspection date" required error={errors.inspection_date?.[0]} inputId="inspection_date">
                  {(fieldProps) => <div className="input-with-icon"><CalendarCheck2 size={18} aria-hidden="true" /><input {...fieldProps} type="date" max={todayIso()} value={form.inspectionDate} onChange={(event) => updateField('inspectionDate', event.target.value)} /></div>}
                </FormField>
              </div>
            </Panel>

            <Panel>
              <SectionHeading title="Service classification" description="Category determines the reporting group and repair-location requirement." />
              <fieldset id="category" className="choice-fieldset" aria-describedby={errors.category?.[0] ? 'category-error' : undefined}>
                <legend>Inspection category <span aria-hidden="true">*</span></legend>
                <div className="choice-grid choice-grid--two">
                  <label className={form.category === 'new_purchase' ? 'choice-card choice-card--selected' : 'choice-card'}>
                    <input type="radio" name="category" value="new_purchase" checked={form.category === 'new_purchase'} onChange={() => handleCategoryChange('new_purchase')} />
                    <span className="choice-card__icon" aria-hidden="true"><Box size={22} /></span>
                    <span><strong>New Purchase</strong><small>Procurement, installation, or handover</small></span>
                  </label>
                  <label className={form.category === 'repair' ? 'choice-card choice-card--selected' : 'choice-card'}>
                    <input type="radio" name="category" value="repair" checked={form.category === 'repair'} onChange={() => handleCategoryChange('repair')} />
                    <span className="choice-card__icon" aria-hidden="true"><Wrench size={22} /></span>
                    <span><strong>Repair</strong><small>Fault, maintenance, or corrective work</small></span>
                  </label>
                </div>
                {errors.category && <p className="form-field__error" id="category-error">{errors.category[0]}</p>}
              </fieldset>

              <div className="form-grid form-grid--two">
                <FormField label="Current status" required error={errors.status?.[0]} inputId="status">
                  {(fieldProps) => (
                    <select {...fieldProps} value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                      {inspectionStatusOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                    </select>
                  )}
                </FormField>
                {form.category === 'repair' && (
                  <FormField label="Repair location" required error={errors.sub_category?.[0]} inputId="sub_category">
                    {(fieldProps) => (
                      <select
                        {...fieldProps}
                        value={form.subCategory}
                        onChange={(event) => updateField(
                          'subCategory',
                          event.target.value as InspectionFormState['subCategory'],
                          'sub_category',
                        )}
                      >
                        <option value="">Select repair location</option>
                        {repairSubCategoryOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                      </select>
                    )}
                  </FormField>
                )}
              </div>
            </Panel>

            <Panel>
              <SectionHeading title="Assignment and notes" description="Route the work and preserve enough detail for the next person." />
              <div className="form-grid form-grid--two">
                <FormField
                  label="Technical personnel"
                  required
                  error={errors.technical_personnel_id?.[0]}
                  inputId="technical_personnel_id"
                  hint={personnel.length === 0 ? 'No technical personnel are available.' : 'Only personnel from the current resource list can be selected.'}
                >
                  {(fieldProps) => (
                    <div className="input-with-icon">
                      <UserRoundCog size={18} aria-hidden="true" />
                      <select {...fieldProps} value={form.technicalPersonnelId} disabled={personnel.length === 0} onChange={(event) => updateField('technicalPersonnelId', event.target.value, 'technical_personnel_id')}>
                        <option value="">Select technical person</option>
                        {personnel.map((person) => <option value={person.id} key={person.id}>{person.name}{person.specialization ? ` · ${person.specialization}` : ''}</option>)}
                      </select>
                    </div>
                  )}
                </FormField>
                <div aria-hidden="true" />
                <FormField label="Remarks" required error={errors.remarks?.[0]} inputId="remarks" className="form-grid__full" hint="Describe symptoms, work performed, parts used, or handover details.">
                  {(fieldProps) => <textarea {...fieldProps} rows={6} value={form.remarks} onChange={(event) => updateField('remarks', event.target.value, 'remarks')} placeholder="Add clear, factual inspection notes…" />}
                </FormField>
              </div>
            </Panel>
          </div>

          <aside className="form-layout__aside">
            <Panel className="form-help-card form-progress-card">
              <span aria-hidden="true"><ClipboardCheck size={24} /></span>
              <p className="eyebrow">Record checklist</p>
              <h2>Complete all sections</h2>
              <ol>
                <li className={form.userId && form.assetId ? 'complete' : ''}><span>1</span> Link the asset and user</li>
                <li className={form.category ? 'complete' : ''}><span>2</span> Classify the service</li>
                <li className={form.technicalPersonnelId ? 'complete' : ''}><span>3</span> Assign technical personnel</li>
                <li className={form.remarks.trim().length >= 10 ? 'complete' : ''}><span>4</span> Record meaningful remarks</li>
              </ol>
            </Panel>
            <Panel className="form-help-card">
              <span aria-hidden="true"><Info size={23} /></span>
              <h2>Data quality</h2>
              <p>Every field is validated on this device. Server validation errors remain beside the field they affect.</p>
              <p className="text-muted">Last form reference: {isEditing ? `Record #${id}` : 'New record'} · {formatDate(todayIso())}</p>
            </Panel>
          </aside>
        </div>

        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate('/inspections')} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting} disabled={assets.length === 0}><Save size={18} aria-hidden="true" />{isEditing ? 'Save changes' : 'Create inspection'}</Button>
        </div>
      </form>
    </div>
  )
}
