import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import AppShell from './components/AppShell'
import { LoadingState } from './components/ui'
import { useAuth } from './hooks/useAuth'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AssetsPage = lazy(() => import('./pages/AssetsPage'))
const AssetFormPage = lazy(() => import('./pages/AssetFormPage'))
const InspectionsPage = lazy(() => import('./pages/InspectionsPage'))
const InspectionFormPage = lazy(() => import('./pages/InspectionFormPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function ProtectedRoute() {
  const { checking, user } = useAuth()
  const location = useLocation()

  if (checking) return <LoadingState label="Checking your session" />
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <AppShell />
}

function RoleRoute({ roles }: { roles: string[] }) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role || 'user')) {
    return <Navigate to={user?.role === 'user' ? '/assets' : '/'} replace />
  }

  return <Outlet />
}

export default function App() {
  return (
    <Suspense fallback={<LoadingState label="Loading workspace" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="assets" element={<AssetsPage />} />
          <Route path="inspections" element={<InspectionsPage />} />

          <Route element={<RoleRoute roles={['admin', 'technician']} />}>
            <Route index element={<DashboardPage />} />
            <Route path="inspections/new" element={<InspectionFormPage />} />
            <Route path="inspection-form" element={<InspectionFormPage />} />
            <Route path="inspections/:id/edit" element={<InspectionFormPage />} />
            <Route path="reports" element={<ReportsPage />} />
          </Route>

          <Route element={<RoleRoute roles={['admin']} />}>
            <Route path="assets/new" element={<AssetFormPage />} />
            <Route path="assets/:id/edit" element={<AssetFormPage />} />
            <Route path="resources" element={<ResourcesPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
