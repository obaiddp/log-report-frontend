import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { cn } from '../lib/format'
import { ToastContext, type ToastTone } from '../context/toast-context'

interface ToastItem {
  id: number
  message: string
  tone: ToastTone
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((items) => items.filter((item) => item.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = Date.now() + Math.random()
      setToasts((items) => [...items.slice(-2), { id, message, tone }])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className={cn('toast', `toast--${toast.tone}`)} key={toast.id}>
            {toast.tone === 'success' ? (
              <CheckCircle2 size={20} aria-hidden="true" />
            ) : (
              <CircleAlert size={20} aria-hidden="true" />
            )}
            <span>{toast.message}</span>
            <button
              className="icon-button toast__close"
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
