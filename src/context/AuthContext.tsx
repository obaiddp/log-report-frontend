/* oxlint-disable react/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { LoadingState } from '../components/ui'
import { get, initializeCsrfCookie, post, setUnauthorizedHandler, shouldIgnoreRequest } from '../lib/api'
import { isRecord } from '../lib/support'
import type { User } from '../types'

interface LoginInput {
  email: string
  password: string
  remember?: boolean
}

export interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (input: LoginInput) => Promise<User>
  logout: () => Promise<void>
  clearAuth: () => void
  isAdmin: boolean
  isTechnicalResource: boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function userFromResponse(response: unknown): User {
  if (isRecord(response)) {
    if (isRecord(response.user)) return response.user as unknown as User
    if (isRecord(response.data)) {
      if (isRecord(response.data.user)) return response.data.user as unknown as User
      return response.data as unknown as User
    }
    return response as unknown as User
  }
  throw new Error('The authentication response did not include a user.')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const clearAuth = useCallback(() => {
    setUser(null)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    void get<unknown>('/v1/auth/me', { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setUser(userFromResponse(response))
      })
      .catch((error: unknown) => {
        if (!shouldIgnoreRequest(error) && !controller.signal.aborted) setUser(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      if (location.pathname !== '/login') {
        navigate('/login', {
          replace: true,
          state: { from: location },
        })
      }
    })
    return () => setUnauthorizedHandler(undefined)
  }, [location, navigate])

  const login = useCallback(async (input: LoginInput) => {
    await initializeCsrfCookie()
    const response = await post<unknown>('/v1/auth/login', {
      email: input.email.trim(),
      password: input.password,
      remember: input.remember ?? false,
    })
    const authenticatedUser = userFromResponse(response)
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await post('/v1/auth/logout')
    } catch {
      // Logout is best-effort; local state must still be cleared.
    } finally {
      setUser(null)
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      logout,
      clearAuth,
      isAdmin: user?.role === 'admin',
      isTechnicalResource: user?.role === 'technical_resource',
    }),
    [clearAuth, loading, login, logout, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState label="Checking your session" />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

export function RequireAdmin() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState label="Checking your session" />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  if (user.role !== 'admin') {
    return <Navigate to="/my-work" replace />
  }
  return <Outlet />
}

export function GuestOnly() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState label="Checking your session" />
  if (user) {
    const from = isRecord(location.state) && isRecord(location.state.from) ? location.state.from : null
    const pathname = from && typeof from.pathname === 'string' ? from.pathname : '/'
    const search = from && typeof from.search === 'string' ? from.search : ''
    const hash = from && typeof from.hash === 'string' ? from.hash : ''
    return <Navigate to={`${pathname}${search}${hash}`} replace />
  }
  return <Outlet />
}
