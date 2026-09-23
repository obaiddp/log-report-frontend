import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Inbox,
  LoaderCircle,
  Search,
  X,
} from 'lucide-react'
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { cn, formatNumber, statusTone, titleCase } from '../lib/format'
import type { EntityId, FieldErrors } from '../types'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'default' | 'small'
  loading?: boolean
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'default',
  loading = false,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn('button', `button--${variant}`, `button--${size}`, className)}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="spin" size={18} aria-hidden="true" />}
      {children}
    </button>
  )
}

export const IconButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }
>(function IconButton({ label, children, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn('icon-button', className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  )
})

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </header>
  )
}

export function Panel({
  children,
  className,
  as: Element = 'section',
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'article' | 'div'
}) {
  return <Element className={cn('panel', className)}>{children}</Element>
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatusBadge({ value }: { value?: string | null }) {
  const label = value ? titleCase(value) : 'Unknown'
  return (
    <span className={cn('status-badge', `status-badge--${statusTone(value)}`)}>
      <span className="status-badge__dot" aria-hidden="true" />
      {label}
    </span>
  )
}

export function LoadingState({ label = 'Loading data' }: { label?: string }) {
  return (
    <div className="state-panel" role="status" aria-live="polite">
      <LoaderCircle className="spin" size={24} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export function Skeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-group" role="status" aria-label="Loading content">
      {Array.from({ length: count }, (_, index) => (
        <div className="skeleton" key={index} />
      ))}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  compact = false,
}: {
  message: string
  onRetry?: () => void
  compact?: boolean
}) {
  return (
    <div className={cn('state-panel state-panel--error', compact && 'state-panel--compact')} role="alert">
      <AlertTriangle size={compact ? 20 : 26} aria-hidden="true" />
      <div>
        <strong>{compact ? 'Unable to load' : 'Something went wrong'}</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="small" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: ReactNode
}) {
  return (
    <div className="state-panel state-panel--empty">
      <span className="state-panel__icon" aria-hidden="true">
        <Inbox size={26} />
      </span>
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {action}
    </div>
  )
}

interface FieldRenderProps {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

interface FormFieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  inputId?: string
  children: (props: FieldRenderProps) => ReactNode
  className?: string
}

export function FormField({
  label,
  error,
  hint,
  required = false,
  inputId,
  children,
  className,
}: FormFieldProps) {
  const generatedId = useId()
  const id = inputId || `field-${generatedId.replace(/:/g, '')}`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('form-field', error && 'form-field--error', className)}>
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
        {required && <span className="sr-only"> (required)</span>}
      </label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && (
        <p className="form-field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {error && (
        <p className="form-field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  )
}

export const FormErrorSummary = forwardRef<
  HTMLDivElement,
  { errors: FieldErrors }
>(function FormErrorSummary({ errors }, ref) {
  if (Object.keys(errors).length === 0) return null

  return (
    <div className="form-error-summary" role="alert" tabIndex={-1} ref={ref}>
      <AlertTriangle size={20} aria-hidden="true" />
      <div>
        <strong>Review the highlighted fields</strong>
        <ul>
          {Object.entries(errors).map(([field, messages]) => (
            <li key={field}>
              <a href={`#${field}`}>{titleCase(field)}</a>: {messages[0]}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
})

interface SearchableComboboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: Array<{ id: EntityId; label: string; description?: string }>
  error?: string
  hint?: string
  inputId?: string
}

export function SearchableCombobox({
  label,
  value,
  onValueChange,
  options,
  error,
  hint,
  inputId,
  required = false,
  placeholder = 'Start typing to search…',
  ...props
}: SearchableComboboxProps) {
  const listId = useId()
  return (
    <FormField label={label} error={error} hint={hint} inputId={inputId} required={required}>
      {(fieldProps) => (
        <div className="combobox">
          <Search size={18} aria-hidden="true" />
          <input
            {...fieldProps}
            {...props}
            type="search"
            list={listId}
            value={value}
            placeholder={placeholder}
            onChange={(event) => onValueChange(event.target.value)}
          />
          <datalist id={listId}>
            {options.map((option) => (
              <option value={option.label} key={String(option.id)}>
                {option.description}
              </option>
            ))}
          </datalist>
        </div>
      )}
    </FormField>
  )
}

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  size?: 'small' | 'medium' | 'large'
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'medium',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return

    const previousActive = document.activeElement as HTMLElement | null
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const dialog = dialogRef.current
    window.requestAnimationFrame(() => {
      dialog?.querySelector<HTMLElement>(focusableSelector)?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousActive?.focus()
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <div
        className={cn('modal', `modal--${size}`)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        ref={dialogRef}
      >
        <header className="modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={20} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean
  title: string
  message: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="small"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={busy}>
            Delete
          </Button>
        </>
      }
    >
      <p className="confirm-copy">{message}</p>
    </Modal>
  )
}

export function Pagination({
  page,
  lastPage,
  total,
  onPageChange,
  busy = false,
}: {
  page: number
  lastPage: number
  total: number
  onPageChange: (page: number) => void
  busy?: boolean
}) {
  if (total === 0) return null

  return (
    <nav className="pagination" aria-label="Pagination">
      <p>
        Page <strong>{page}</strong> of <strong>{Math.max(lastPage, 1)}</strong>{' '}
        <span>({formatNumber(total)} total)</span>
      </p>
      <div>
        <Button
          variant="secondary"
          size="small"
          disabled={page <= 1 || busy}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={18} aria-hidden="true" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="small"
          disabled={page >= lastPage || busy}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight size={18} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  )
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = 'blue',
}: {
  label: string
  value: ReactNode
  hint?: string
  icon: ReactNode
  tone?: 'blue' | 'green' | 'amber' | 'violet'
}) {
  return (
    <article className={cn('metric-card', `metric-card--${tone}`)}>
      <span className="metric-card__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {hint && <span>{hint}</span>}
      </div>
    </article>
  )
}

export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="check-list">
      {items.map((item) => (
        <li key={item}>
          <Check size={16} aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  )
}
