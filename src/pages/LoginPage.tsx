import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  Button,
  FormErrorSummary,
  FormField,
  LoadingState,
} from '../components/ui'
import { useAuth } from '../hooks/useAuth'
import { getErrorMessage, getFieldErrors } from '../lib/api'
import type { FieldErrors } from '../types'

export default function LoginPage() {
  const { checking, login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const summaryRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const destination = (location.state as { from?: string } | null)?.from || '/'
  if (!checking && user) return <Navigate to={destination} replace />
  if (checking) return <LoadingState label="Checking your session" />

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FieldErrors = {}
    if (!email.trim()) nextErrors.email = ['Enter your work email address.']
    else if (!/^\S+@\S+\.\S+$/.test(email)) nextErrors.email = ['Enter a valid email address.']
    if (!password) nextErrors.password = ['Enter your password.']
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setFormError('')
      window.requestAnimationFrame(() => summaryRef.current?.focus())
      return
    }

    setSubmitting(true)
    setErrors({})
    setFormError('')
    try {
      await login({ email: email.trim(), password, remember })
      navigate(destination, { replace: true })
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      setFormError(
        Object.keys(fieldErrors).length > 0
          ? ''
          : getErrorMessage(error) || 'Sign in failed. Check your credentials.',
      )
      window.requestAnimationFrame(() => summaryRef.current?.focus())
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <main className="login-main">
        <section className="login-card" aria-labelledby="login-title">
          <div className="brand brand--login">
            <span className="brand__mark" aria-hidden="true">
              <ShieldCheck size={26} />
            </span>
            <span>
              <strong>AssetOps</strong>
              <small>Inspection console</small>
            </span>
          </div>

          <div className="login-heading">
            <p className="eyebrow">Secure operations portal</p>
            <h1 id="login-title">Welcome back</h1>
            <p>Sign in with your authorized work account to continue.</p>
          </div>

          {formError && (
            <div className="form-error-summary" role="alert">
              <LockKeyhole size={20} aria-hidden="true" />
              <div>
                <strong>Unable to sign in</strong>
                <p>{formError}</p>
              </div>
            </div>
          )}
          <FormErrorSummary errors={errors} ref={summaryRef} />

          <form className="form-stack" onSubmit={handleSubmit} noValidate>
            <FormField label="Work email" error={errors.email?.[0]} inputId="email" required>
              {(fieldProps) => (
                <div className="input-with-icon">
                  <Mail size={18} aria-hidden="true" />
                  <input
                    {...fieldProps}
                    type="email"
                    autoComplete="username"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                  />
                </div>
              )}
            </FormField>

            <FormField label="Password" error={errors.password?.[0]} inputId="password" required>
              {(fieldProps) => (
                <div className="input-with-action">
                  <input
                    {...fieldProps}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                  </button>
                </div>
              )}
            </FormField>

            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>Keep me signed in on this device</span>
            </label>

            <Button type="submit" loading={submitting} className="login-submit">
              Sign in securely
            </Button>
          </form>

          <p className="login-help">
            Need access? Contact your system administrator. Password fields support browser
            password managers and pasted credentials.
          </p>
        </section>

        <aside className="login-aside" aria-label="About this portal">
          <div className="login-aside__content">
            <span className="login-aside__icon" aria-hidden="true">
              <ShieldCheck size={30} />
            </span>
            <p className="eyebrow">One operational record</p>
            <h2>Keep every asset accountable.</h2>
            <p>
              Track ownership, inspections, repairs, and purchasing from one reliable
              workspace built for IT operations teams.
            </p>
            <ul>
              <li>Complete assignments with structured inspection records</li>
              <li>Monitor asset health and department utilization</li>
              <li>Move from daily checks to long-term reporting</li>
            </ul>
          </div>
          <p className="login-aside__footnote">Protected by Sanctum session authentication</p>
        </aside>
      </main>
    </div>
  )
}
