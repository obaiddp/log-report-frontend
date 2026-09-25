import { ArrowRight, CheckCircle2, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, FormErrorSummary, FormField } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage, getFieldErrors } from '../lib/api'
import type { FieldErrors } from '../types'

function destinationFromState(state: unknown): string {
  if (!state || typeof state !== 'object' || !('from' in state)) return '/'
  const from = state.from
  if (!from || typeof from !== 'object') return '/'
  const pathname = 'pathname' in from && typeof from.pathname === 'string' ? from.pathname : '/'
  const search = 'search' in from && typeof from.search === 'string' ? from.search : ''
  const hash = 'hash' in from && typeof from.hash === 'string' ? from.hash : ''
  return `${pathname}${search}${hash}`
}

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const summaryRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const updateField = (field: string) => {
    setErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validation: FieldErrors = {}
    if (!email.trim()) validation.email = ['Enter your work email address.']
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) validation.email = ['Enter a valid email address.']
    if (!password) validation.password = ['Enter your password.']
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      setFormError('')
      window.requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setSubmitting(true)
    setErrors({})
    setFormError('')
    try {
      await login({ email, password, remember })
      navigate(destinationFromState(location.state), { replace: true })
    } catch (error: unknown) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      setFormError(Object.keys(fieldErrors).length > 0 ? '' : getErrorMessage(error))
      window.requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-main">
        <section className="login-card" aria-labelledby="login-title">
          <div className="brand brand--login">
            <span className="brand__mark" aria-hidden="true"><ShieldCheck size={25} strokeWidth={1.8} /></span>
            <span>
              <strong>Support Desk</strong>
              <small>IT support log</small>
            </span>
          </div>

          <div className="login-heading">
            <p className="eyebrow">Secure workspace</p>
            <h1 id="login-title">Welcome back</h1>
            <p>Sign in to review requests, coordinate assignments, and keep support work moving.</p>
          </div>

          {formError && (
            <div className="form-error-summary" role="alert">
              <LockKeyhole size={20} aria-hidden="true" />
              <div><strong>Unable to sign in</strong><p>{formError}</p></div>
            </div>
          )}
          <FormErrorSummary errors={errors} ref={summaryRef} />

          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <FormField label="Work email" required error={errors.email?.[0]} inputId="email">
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    updateField('email')
                  }}
                  placeholder="name@company.com"
                />
              )}
            </FormField>
            <FormField label="Password" required error={errors.password?.[0]} inputId="password">
              {(fieldProps) => (
                <input
                  {...fieldProps}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    updateField('password')
                  }}
                  placeholder="Enter your password"
                />
              )}
            </FormField>
            <label className="checkbox-field" htmlFor="remember">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              Keep me signed in on this device
            </label>
            <Button className="login-submit" type="submit" loading={submitting} disabled={submitting}>
              Sign in to Support Desk
              <ArrowRight size={18} aria-hidden="true" />
            </Button>
          </form>

          <p className="login-help">
            <KeyRound size={14} aria-hidden="true" />
            Access is managed by your organization administrator.
          </p>
        </section>

        <aside className="login-aside" aria-label="Support Desk overview">
          <div className="login-aside__content">
            <span className="login-aside__icon" aria-hidden="true"><CheckCircle2 size={29} /></span>
            <p className="eyebrow">One place for support work</p>
            <h2>Make every request easier to resolve.</h2>
            <p>Capture the issue, coordinate the right resource, and keep a clear record from first report through closure.</p>
            <ul>
              <li>Track status, priority, and ownership in one queue</li>
              <li>Review department and issue trends with accessible reports</li>
              <li>Keep resolution notes and internal context together</li>
            </ul>
          </div>
          <p className="login-aside__footnote">Protected internal workspace · Session-based access</p>
        </aside>
      </div>
    </main>
  )
}
