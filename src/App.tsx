import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { LoadingState } from './components/ui'
import { GuestOnly, RequireAdmin, RequireAuth } from './context/AuthContext'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SupportLogsPage = lazy(() => import('./pages/SupportLogsPage'))
const SupportLogFormPage = lazy(() => import('./pages/SupportLogFormPage'))
const SupportLogDetailPage = lazy(() => import('./pages/SupportLogDetailPage'))
const MyWorkPage = lazy(() => import('./pages/MyWorkPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const AdminDepartmentsPage = lazy(() => import('./pages/AdminDepartmentsPage'))
const AdminConfigurationPage = lazy(() => import('./pages/AdminConfigurationPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <Suspense fallback={<LoadingState label="Loading workspace" />}>
      <Routes>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            {/* Main content */}
            <Route element={<RequireAdmin />}>
              <Route index element={<DashboardPage />} />
            </Route>


            <Route path="support-logs" element={<SupportLogsPage />} />
            <Route path="support-logs/new" element={<SupportLogFormPage />} />
            <Route path="support-logs/:id" element={<SupportLogDetailPage />} />
            <Route path="support-logs/:id/edit" element={<SupportLogFormPage />} />
            <Route path="my-work" element={<MyWorkPage />} />

            <Route element={<RequireAdmin />}>
              <Route path="reports" element={<ReportsPage />} />
              <Route path="admin/users" element={<AdminUsersPage />} />
              <Route path="admin/departments" element={<AdminDepartmentsPage />} />
              <Route path="admin/configuration" element={<AdminConfigurationPage />} />
            </Route>

            <Route path="assets" element={<Navigate to="/support-logs" replace />} />
            <Route path="assets/new" element={<Navigate to="/support-logs/new" replace />} />
            <Route path="assets/:id/edit" element={<Navigate to="/support-logs" replace />} />
            <Route path="inspections" element={<Navigate to="/support-logs" replace />} />
            <Route path="inspection-form" element={<Navigate to="/support-logs/new" replace />} />
            <Route path="inspections/new" element={<Navigate to="/support-logs/new" replace />} />
            <Route path="inspections/:id/edit" element={<Navigate to="/support-logs" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
