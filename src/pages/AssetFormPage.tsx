import {
  ArrowLeft,
  Box,
  CalendarDays,
  HardDrive,
  Info,
  MemoryStick,
  Save,
  UserRound,
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
import { assetTypeOptions } from '../lib/constants'
import { todayIso } from '../lib/format'
import type { Asset, Department, EntityId, FieldErrors, Paginated, User } from '../types'

interface AssetFormState {
  userLabel: string
  userId: EntityId | ''
  departmentId: EntityId | ''
  type: string
  brand: string
  model: string
  serialNumber: string
  ramGb: string
  storage: string
  assetTag: string
  acquiredAt: string
}

const emptyForm: AssetFormState = {
  userLabel: '',
  userId: '',
  departmentId: '',
  type: '',
  brand: '',
  model: '',
  serialNumber: '',
  ramGb: '',
  storage: '',
  assetTag: '',
  acquiredAt: todayIso(),
}

export default function AssetFormPage() {
  const { id } = useParams()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { notify } = useToast()
  const summaryRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<AssetFormState>(emptyForm)
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
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

    const resourceRequests = Promise.all([
      get<Paginated<User>>('/v1/users', {
        params: { per_page: 100, status: 'active', sort_by: 'name', sort_direction: 'asc' },
        signal: controller.signal,
      }),
      get<Paginated<Department>>('/v1/departments', {
        params: { per_page: 100, sort_by: 'name', sort_direction: 'asc' },
        signal: controller.signal,
      }),
    ])

    const assetRequest = id
      ? get<Asset | { data: Asset }>(`/v1/assets/${id}`, { signal: controller.signal }).then((response) =>
          'data' in response ? response.data : response,
        )
      : Promise.resolve(null)

    void Promise.all([resourceRequests, assetRequest])
      .then(([resourceResponse, asset]) => {
        const [userResponse, departmentResponse] = resourceResponse
        setUsers(userResponse.data ?? [])
        setDepartments(departmentResponse.data ?? [])
        if (asset) {
          setForm({
            userLabel: asset.user?.name ?? '',
            userId: asset.user?.id ?? asset.user_id ?? '',
            departmentId: asset.department?.id ?? asset.department_id ?? '',
            type: asset.type ?? '',
            brand: asset.brand ?? '',
            model: asset.model ?? '',
            serialNumber: asset.serial_number ?? '',
            ramGb: asset.ram_gb != null ? String(asset.ram_gb) : (asset.ram?.match(/\d+(?:\.\d+)?/)?.[0] ?? ''),
            storage: asset.storage ?? '',
            assetTag: asset.asset_tag ?? '',
            acquiredAt: asset.acquired_at?.slice(0, 10) ?? '',
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

  const updateField = (field: keyof AssetFormState, value: string | EntityId | '') => {
    const errorFields: Partial<Record<keyof AssetFormState, string>> = {
      userLabel: 'user_id',
      departmentId: 'department_id',
      serialNumber: 'serial_number',
      ramGb: 'ram_gb',
      assetTag: 'asset_tag',
      acquiredAt: 'acquired_at',
    }
    const errorField = errorFields[field] || field
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[errorField]) {
      setErrors((current) => {
        const next = { ...current }
        delete next[errorField]
        return next
      })
    }
  }

  const handleUserChange = (value: string) => {
    const selectedUser = users.find(
      (user) => user.name.toLowerCase() === value.trim().toLowerCase(),
    )

    setForm((current) => ({
      ...current,
      userLabel: value,
      userId: selectedUser?.id ?? '',
      departmentId: selectedUser?.department_id ?? '',
    }))

    if (errors.user_id || errors.department_id) {
      setErrors((current) => {
        const next = { ...current }
        delete next.user_id
        delete next.department_id
        return next
      })
    }
  }

  const validate = (): { valid: boolean; errors: FieldErrors } => {
    const nextErrors: FieldErrors = {}
    const selectedUser = users.find(
      (user) => user.name.toLowerCase() === form.userLabel.trim().toLowerCase(),
    )

    if (!form.userLabel.trim()) nextErrors.user_id = ['Search for and select an assigned user.']
    else if (!selectedUser) nextErrors.user_id = ['Select a user from the search suggestions.']
    if (!form.departmentId) nextErrors.department_id = ['Select the owning department.']
    if (!form.type) nextErrors.type = ['Select an asset type.']
    if (!form.brand.trim()) nextErrors.brand = ['Enter the manufacturer or brand.']
    if (!form.model.trim()) nextErrors.model = ['Enter the model name.']
    if (!form.serialNumber.trim()) nextErrors.serial_number = ['Enter the serial number.']
    if (!form.ramGb.trim()) nextErrors.ram_gb = ['Enter the installed RAM in gigabytes.']
    else if (!Number.isFinite(Number(form.ramGb)) || Number(form.ramGb) <= 0) {
      nextErrors.ram_gb = ['Enter RAM as a number greater than zero.']
    }
    if (!form.storage.trim()) nextErrors.storage = ['Enter the storage type and capacity.']
    if (!form.assetTag.trim()) nextErrors.asset_tag = ['Enter a unique asset tag.']
    if (!form.acquiredAt) nextErrors.acquired_at = ['Enter the acquisition date.']
    else if (form.acquiredAt > todayIso()) nextErrors.acquired_at = ['Acquisition date cannot be in the future.']

    return { valid: Object.keys(nextErrors).length === 0, errors: nextErrors }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation = validate()
    if (!validation.valid) {
      setErrors(validation.errors)
      setFormError('')
      window.requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    const selectedUser = users.find(
      (user) => user.name.toLowerCase() === form.userLabel.trim().toLowerCase(),
    )!
    const payload = {
      user_id: selectedUser.id,
      type: form.type,
      brand: form.brand.trim(),
      model: form.model.trim(),
      serial_number: form.serialNumber.trim(),
      ram: `${Number(form.ramGb)} GB`,
      ram_gb: Number(form.ramGb),
      storage: form.storage.trim(),
      asset_tag: form.assetTag.trim(),
      acquired_at: form.acquiredAt,
    }

    setSubmitting(true)
    setErrors({})
    setFormError('')
    try {
      if (id) await put(`/v1/assets/${id}`, payload)
      else await post('/v1/assets', payload)
      notify(isEditing ? 'Asset updated successfully.' : 'Asset registered successfully.')
      navigate('/assets')
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      setFormError(
        Object.keys(fieldErrors).length > 0 ? '' : getErrorMessage(error),
      )
      window.requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState label="Loading asset form" />
  if (loadError) {
    return <ErrorState message={loadError} onRetry={() => setReloadKey((value) => value + 1)} />
  }

  return (
    <div className="page-stack form-page">
      <PageHeader
        eyebrow="Asset register"
        title={isEditing ? 'Edit asset' : 'Register a new asset'}
        description="Record the hardware, ownership, and acquisition details exactly as they should appear in the register."
        actions={
          <Link className="button button--secondary button--default" to="/assets">
            <ArrowLeft size={18} aria-hidden="true" />
            Back to assets
          </Link>
        }
      />

      {formError && (
        <div className="form-error-summary" role="alert">
          <Info size={20} aria-hidden="true" />
          <div><strong>Unable to save this asset</strong><p>{formError}</p></div>
        </div>
      )}
      <FormErrorSummary errors={errors} ref={summaryRef} />

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-layout">
          <div className="form-layout__main">
            <Panel>
              <SectionHeading title="Ownership" description="Assign a clear owner and organizational home." />
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
                  hint="Type a name and choose a suggestion from the list."
                  autoComplete="off"
                />
                <FormField
                  label="Department"
                  required
                  error={errors.department_id?.[0]}
                  inputId="department_id"
                  hint="Taken from the selected user's directory record."
                >
                  {(fieldProps) => (
                    <select
                      {...fieldProps}
                      value={form.departmentId}
                      disabled
                    >
                      <option value="">Select department</option>
                      {departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}
                    </select>
                  )}
                </FormField>
              </div>
            </Panel>

            <Panel>
              <SectionHeading title="Asset identity" description="Use the manufacturer and tracking identifiers from the device label." />
              <div className="form-grid form-grid--two">
                <FormField label="Asset type" required error={errors.type?.[0]} inputId="type">
                  {(fieldProps) => (
                    <select {...fieldProps} value={form.type} onChange={(event) => updateField('type', event.target.value)}>
                      <option value="">Select type</option>
                      {assetTypeOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                    </select>
                  )}
                </FormField>
                <FormField label="Asset tag" required error={errors.asset_tag?.[0]} inputId="asset_tag" hint="A short, unique internal identifier.">
                  {(fieldProps) => <input {...fieldProps} value={form.assetTag} onChange={(event) => updateField('assetTag', event.target.value)} placeholder="e.g. CEF-LT-0142" />}
                </FormField>
                <FormField label="Brand" required error={errors.brand?.[0]} inputId="brand">
                  {(fieldProps) => <input {...fieldProps} value={form.brand} onChange={(event) => updateField('brand', event.target.value)} placeholder="Manufacturer" />}
                </FormField>
                <FormField label="Model" required error={errors.model?.[0]} inputId="model">
                  {(fieldProps) => <input {...fieldProps} value={form.model} onChange={(event) => updateField('model', event.target.value)} placeholder="Model name or number" />}
                </FormField>
                <FormField label="Serial number" required error={errors.serial_number?.[0]} inputId="serial_number" className="form-grid__full">
                  {(fieldProps) => <input {...fieldProps} value={form.serialNumber} onChange={(event) => updateField('serialNumber', event.target.value)} placeholder="Manufacturer serial number" autoCapitalize="characters" />}
                </FormField>
              </div>
            </Panel>

            <Panel>
              <SectionHeading title="Technical specifications" description="Capture capacity using consistent units for reporting." />
              <div className="form-grid form-grid--two">
                <FormField label="Installed RAM (GB)" required error={errors.ram_gb?.[0]} inputId="ram_gb">
                  {(fieldProps) => <div className="input-with-suffix"><MemoryStick size={18} aria-hidden="true" /><input {...fieldProps} type="number" inputMode="decimal" min="0.5" step="0.5" value={form.ramGb} onChange={(event) => updateField('ramGb', event.target.value)} placeholder="8" /><span>GB</span></div>}
                </FormField>
                <FormField label="Storage" required error={errors.storage?.[0]} inputId="storage" hint="Example: 512 GB NVMe or 1 TB HDD.">
                  {(fieldProps) => <div className="input-with-icon"><HardDrive size={18} aria-hidden="true" /><input {...fieldProps} value={form.storage} onChange={(event) => updateField('storage', event.target.value)} placeholder="512 GB NVMe" /></div>}
                </FormField>
                <FormField label="Acquired date" required error={errors.acquired_at?.[0]} inputId="acquired_at">
                  {(fieldProps) => <div className="input-with-icon"><CalendarDays size={18} aria-hidden="true" /><input {...fieldProps} type="date" max={todayIso()} value={form.acquiredAt} onChange={(event) => updateField('acquiredAt', event.target.value)} /></div>}
                </FormField>
              </div>
            </Panel>
          </div>

          <aside className="form-layout__aside">
            <Panel className="form-help-card">
              <span aria-hidden="true"><Box size={23} /></span>
              <h2>Before you save</h2>
              <ul className="check-list">
                <li>Confirm the serial number from the hardware label</li>
                <li>Use the active user record, not a typed approximation</li>
                <li>Keep RAM and storage units visible for accurate reports</li>
                <li>Check the asset tag is unique</li>
              </ul>
            </Panel>
            <Panel className="form-help-card">
              <span aria-hidden="true"><UserRound size={23} /></span>
              <h2>Need to add a user?</h2>
              <p>Only existing users can own an asset. Add people from Admin resources first.</p>
              <Link className="text-link" to="/resources">Open resources</Link>
            </Panel>
          </aside>
        </div>

        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate('/assets')} disabled={submitting}>Cancel</Button>
          <Button type="submit" loading={submitting}><Save size={18} aria-hidden="true" />{isEditing ? 'Save changes' : 'Register asset'}</Button>
        </div>
      </form>
    </div>
  )
}
