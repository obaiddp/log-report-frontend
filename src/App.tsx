import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedLayout from "@/components/ProtectedLayout";
import { useAuth } from "@/context/AuthContext";

import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import ProfilePage from "./pages/ProfilePage";
import SupportLogsPage from "./pages/SupportLogsPage";
import NotFoundPage from "./pages/NotFoundPage";
import DepartmentsPage from "./pages/admin/DepartmentsPage";
import ItemsPage from "./pages/admin/ItemsPage";
import IssuesPage from "./pages/admin/IssuesPage";

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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/support-logs" element={<SupportLogsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin/departments" element={<DepartmentsPage />} />
          <Route path="/admin/items" element={<ItemsPage />} />
          <Route path="/admin/issues" element={<IssuesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
