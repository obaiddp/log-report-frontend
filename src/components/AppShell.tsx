import {
  BarChart3,
  Building2,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { cn } from '../lib/format'
import { getInitials } from '../lib/support'
import { Button, IconButton } from './ui'

interface NavigationItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  adminOnly?: boolean
}

const navigation: NavigationItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, adminOnly: true },
  { to: '/support-logs', label: 'Support Logs', icon: ClipboardList },
  { to: '/support-logs/new', label: 'Create Log', icon: FilePlus2 },
  { to: '/my-work', label: 'My Work', icon: ListChecks },
  { to: '/reports', label: 'Reports', icon: BarChart3, adminOnly: true },
  { to: '/admin/users', label: 'Users', icon: UsersRound, adminOnly: true },
  { to: '/admin/departments', label: 'Departments', icon: Building2, adminOnly: true },
  { to: '/admin/configuration', label: 'Configuration', icon: Settings2, adminOnly: true },
]

const pageLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/support-logs': 'Support Logs',
  '/support-logs/new': 'Create Support Log',
  '/my-work': 'My Work',
  '/reports': 'Reports',
  '/admin/users': 'User administration',
  '/admin/departments': 'Department administration',
  '/admin/configuration': 'Support configuration',
}

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  const stored = window.localStorage.getItem('support-desk-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function roleLabel(role: string | null | undefined): string {
  if (role === 'admin') return 'Administrator'
  if (role === 'technical_resource') return 'Technical Resource'
  return 'Support user'
}

function currentPageLabel(pathname: string): string {
  if (pathname.startsWith('/support-logs/')) {
    if (pathname.endsWith('/edit')) return 'Edit Support Log'
    if (pathname.endsWith('/new')) return 'Create Support Log'
    return 'Support Log detail'
  }
  return pageLabels[pathname] || 'Support workspace'
}

export default function AppShell() {
  const { user, isAdmin, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousPath = useRef(location.pathname)
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || isAdmin)
  const initials = getInitials(user?.name)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('support-desk-theme', theme)
  }, [theme])

  useEffect(() => {
    setMobileOpen(false)
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname
      mainRef.current?.focus({ preventScroll: true })
      window.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const previousOverflow = document.body.style.overflow
    const menuButton = menuButtonRef.current
    const closeButton = closeButtonRef.current
    document.body.style.overflow = 'hidden'
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        return
      }
      if (event.key !== 'Tab') return
      const sidebar = closeButton?.closest('aside')
      if (!sidebar) return
      const focusable = Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
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
    document.addEventListener('keydown', handleEscape)
    window.requestAnimationFrame(() => closeButton?.focus())
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleEscape)
      menuButton?.focus()
    }
  }, [mobileOpen])

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className={cn('sidebar', mobileOpen && 'sidebar--open')} aria-label="Primary navigation">
        <div className="brand brand--sidebar">
          <span className="brand__mark" aria-hidden="true">
            <ShieldCheck size={25} strokeWidth={1.8} />
          </span>
          <span>
            <strong>Support Desk</strong>
            <small>IT support log</small>
          </span>
          <IconButton
            ref={closeButtonRef}
            className="sidebar__close"
            label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X size={21} aria-hidden="true" />
          </IconButton>
        </div>

        <nav className="sidebar__nav">
          <p className="sidebar__label">Workspace</p>
          {visibleNavigation.slice(0, 4).map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => cn('nav-link', isActive && 'nav-link--active')}
            >
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <p className="sidebar__label sidebar__label--spaced">Administration</p>
              {visibleNavigation.slice(4).map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => cn('nav-link', isActive && 'nav-link--active')}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar__footer">
          <div className="user-summary">
            <span className="avatar" aria-hidden="true">{initials}</span>
            <span>
              <strong>{user?.name || 'Support user'}</strong>
              <small>{roleLabel(user?.role)}</small>
            </span>
          </div>
          <Button
            className="logout-button"
            variant="ghost"
            size="small"
            onClick={() => void logout()}
            aria-label="Sign out of Support Desk"
          >
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="sidebar-scrim"
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div className="app-workspace">
        <header className="topbar">
          <div className="topbar__leading">
            <IconButton
              ref={menuButtonRef}
              className="topbar__menu"
              label="Open navigation"
              onClick={() => setMobileOpen(true)}
              aria-expanded={mobileOpen}
            >
              <Menu size={22} aria-hidden="true" />
            </IconButton>
            <div>
              <p>Support operations</p>
              <strong>{currentPageLabel(location.pathname)}</strong>
            </div>
          </div>
          <div className="topbar__actions">
            <IconButton
              label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
            </IconButton>
            <span className="topbar__divider" aria-hidden="true" />
            <div className="topbar__user">
              <span className="avatar avatar--small" aria-hidden="true">{initials}</span>
              <span>
                <strong>{user?.name || 'Support user'}</strong>
                <small>{roleLabel(user?.role)}</small>
              </span>
            </div>
          </div>
        </header>

        <main id="main-content" className="main-content" tabIndex={-1} ref={mainRef}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
