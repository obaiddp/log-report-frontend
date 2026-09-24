import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import { LoadingState } from './components/ui'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const AssetsPage = lazy(() => import('./pages/AssetsPage'))
const AssetFormPage = lazy(() => import('./pages/AssetFormPage'))
const InspectionsPage = lazy(() => import('./pages/InspectionsPage'))
const InspectionFormPage = lazy(() => import('./pages/InspectionFormPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

export default function App() {
  return (
    <Suspense fallback={<LoadingState label="Loading workspace" />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="assets/new" element={<AssetFormPage />} />
          <Route path="assets/:id/edit" element={<AssetFormPage />} />
          <Route path="inspections" element={<InspectionsPage />} />
          <Route path="inspections/new" element={<InspectionFormPage />} />
          <Route path="inspection-form" element={<InspectionFormPage />} />
          <Route path="inspections/:id/edit" element={<InspectionFormPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
