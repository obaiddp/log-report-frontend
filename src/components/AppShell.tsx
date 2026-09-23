import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings2,
  Sun,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { cn, titleCase } from '../lib/format'
import { Button, IconButton } from './ui'

const navigation = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['admin', 'technician'] },
  { to: '/assets', label: 'Assets', icon: Boxes },
  { to: '/inspections', label: 'Inspections', icon: ClipboardCheck },
  { to: '/inspection-form', label: 'New inspection', icon: FilePlus2, roles: ['admin', 'technician'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'technician'] },
  { to: '/resources', label: 'Resources', icon: Settings2, roles: ['admin'] },
]

const pageLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/assets': 'Asset register',
  '/inspections': 'Inspections',
  '/inspection-form': 'Asset inspection form',
  '/reports': 'Reports',
  '/resources': 'Admin resources',
}

type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  const stored = window.localStorage.getItem('asset-inspection-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

export default function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(getInitialTheme)
  const { logout, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const mainRef = useRef<HTMLElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousPath = useRef(location.pathname)
  const loggingOut = useRef(false)
  const [logoutBusy, setLogoutBusy] = useState(false)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    window.localStorage.setItem('asset-inspection-theme', theme)
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

  const handleLogout = async () => {
    if (loggingOut.current) return
    loggingOut.current = true
    setLogoutBusy(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      loggingOut.current = false
      setLogoutBusy(false)
    }
  }

  const visibleNavigation = navigation.filter(
    (item) => !('roles' in item) || item.roles?.includes(user?.role || 'user'),
  )

  const currentLabel = location.pathname.startsWith('/assets/')
    ? location.pathname.endsWith('/edit')
      ? 'Edit asset'
      : 'New asset'
    : location.pathname.startsWith('/inspections/')
      ? location.pathname.endsWith('/edit')
        ? 'Edit inspection'
        : 'New inspection'
      : pageLabels[location.pathname] || 'Asset operations'

  return (
    <div className="app-layout">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className={cn('sidebar', mobileOpen && 'sidebar--open')} aria-label="Primary navigation">
        <div className="brand brand--sidebar">
          <span className="brand__mark" aria-hidden="true">
            <ClipboardCheck size={25} strokeWidth={1.8} />
          </span>
          <span>
            <strong>AssetOps</strong>
            <small>Inspection console</small>
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
          {visibleNavigation.map(({ to, label, icon: Icon, end }) => (
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
        </nav>

        <div className="sidebar__footer">
          <div className="user-summary">
            <span className="avatar" aria-hidden="true">
              {(user?.name || 'A').charAt(0).toUpperCase()}
            </span>
            <span>
              <strong>{user?.name || 'Administrator'}</strong>
              <small>{user?.role ? titleCase(user.role) : user?.designation || 'Operations user'}</small>
            </span>
          </div>
          <Button
            variant="ghost"
            className="logout-button"
            onClick={() => void handleLogout()}
            loading={logoutBusy}
          >
            <LogOut size={19} aria-hidden="true" />
            Log out
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
              <p>Asset operations</p>
              <strong>{currentLabel}</strong>
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
              <span className="avatar avatar--small" aria-hidden="true">
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </span>
              <span>
                <strong>{user?.name || 'Administrator'}</strong>
                <small>{user?.email}</small>
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
