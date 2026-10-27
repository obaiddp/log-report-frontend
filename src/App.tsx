import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedLayout from "@/components/ProtectedLayout";
import { useAuth } from "@/context/AuthContext";
import { hasAnyPermission } from "@/lib/permissions";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import SupportLogsPage from "./pages/SupportLogsPage";
import AssetInspectionsPage from "./pages/AssetInspectionsPage";
import AssetInspectionFormPage from "./pages/AssetInspectionFormPage";
import AssetInspectionDetailPage from "./pages/AssetInspectionDetailPage";
import NotFoundPage from "./pages/NotFoundPage";
import DepartmentsPage from "./pages/admin/DepartmentsPage";
import ItemsPage from "./pages/admin/ItemsPage";
import IssuesPage from "./pages/admin/IssuesPage";
import UsersPage from "./pages/admin/UsersPage";
import RolesPermissionsPage from "./pages/admin/RolesPermissionsPage";

function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <LoginPage />;
}

// Blocks a route when the signed-in user has NONE of the given permissions.
// Hiding nav items (navigation.ts) is only cosmetic — without this guard
// anyone could still open a hidden page by typing its URL. Redirects to the
// dashboard instead of rendering the page.
function RequirePermission({
  permissions,
  children,
}: {
  permissions: string[];
  children: ReactNode;
}) {
  const { user } = useAuth();

  if (!hasAnyPermission(user, permissions)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<ProtectedLayout />}>

          <Route path="/profile" element={<ProfilePage />} />

          <Route path="/" element={<DashboardPage />} />

          <Route
            path="/support-logs"
            element={
              <RequirePermission permissions={["manage_support_logs"]}>
                <SupportLogsPage />
              </RequirePermission>
            }
          />

          <Route
            path="/asset-inspections"
            element={
              <RequirePermission permissions={["manage_asset_inspections"]}>
                <AssetInspectionsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/asset-inspections/new"
            element={
              <RequirePermission permissions={["create_asset_inspections"]}>
                <AssetInspectionFormPage />
              </RequirePermission>
            }
          />
          <Route
            path="/asset-inspections/:id"
            element={
              <RequirePermission
                permissions={["manage_asset_inspections", "create_asset_inspections"]}
              >
                <AssetInspectionDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="/asset-inspections/:id/edit"
            element={
              <RequirePermission permissions={["create_asset_inspections"]}>
                <AssetInspectionFormPage />
              </RequirePermission>
            }
          />

          <Route
            path="/admin/departments"
            element={
              <RequirePermission permissions={["manage_departments"]}>
                <DepartmentsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/items"
            element={
              <RequirePermission permissions={["manage_item_types"]}>
                <ItemsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/issues"
            element={
              <RequirePermission permissions={["manage_issue_types"]}>
                <IssuesPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/roles"
            element={
              <RequirePermission permissions={["manage_role_permissions"]}>
                <RolesPermissionsPage />
              </RequirePermission>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequirePermission permissions={["manage_users"]}>
                <UsersPage />
              </RequirePermission>
            }
          />

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}