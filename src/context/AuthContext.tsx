import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { get, post, setUnauthorizedHandler } from '../lib/api'
import type { User } from '../types'
import { AuthContext, type LoginCredentials } from './auth-context'


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(true)

  const refreshUser = useCallback(async (): Promise<User> => {
    const profile = await get<User>('/v1/auth/me')
    setUser(profile)
    return profile
  }, [])

  useEffect(() => {
    let active = true

    setUnauthorizedHandler(() => {
      if (active) setUser(null)
    })

    void get<User>('/v1/auth/me')
      .then((profile) => {
        if (active) setUser(profile)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => {
      active = false
      setUnauthorizedHandler(null)
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials) => {
    await post<{ user?: User }>('/v1/auth/login', credentials)
    return refreshUser()
  }, [refreshUser])

  const logout = useCallback(async () => {
    try {
      await post('/v1/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, checking, login, logout, refreshUser }),
    [checking, login, logout, refreshUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
