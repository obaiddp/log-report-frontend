import type { ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";

import AppShell from "@/components/layout/AppShell";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedLayout({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children ?? <Outlet />}</AppShell>;
}
