import { createContext } from 'react'
import type { User } from '../types'

export interface LoginCredentials {
  email: string
  password: string
  remember?: boolean
}

export interface AuthContextValue {
  user: User | null
  checking: boolean
  login: (credentials: LoginCredentials) => Promise<User>
  logout: () => Promise<void>
  refreshUser: () => Promise<User>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
