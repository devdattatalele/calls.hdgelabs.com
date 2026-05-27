import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCompany } from "@/lib/queries/company";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user)
    return <Navigate to="/signin" state={{ from: location }} replace />;
  return <>{children}</>;
}

export function RequireCompany({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const company = useMyCompany(user?.id);
  const location = useLocation();

  if (loading || company.isLoading) return <FullPageLoader />;
  if (!user)
    return <Navigate to="/signin" state={{ from: location }} replace />;
  if (!company.data) return <Navigate to="/onboard" replace />;
  return <>{children}</>;
}

function FullPageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
    </div>
  );
}
