import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/supabase';
import { normalizeRole, type Permission } from '@/lib/permissions';

type Props = {
  children: React.ReactNode;
  allowedRoles?: (UserRole | string)[];
  requiredPermission?: Permission;
};

export default function ProtectedRoute({ children, allowedRoles, requiredPermission }: Props) {
  const { isAuthenticated, role, loading, hasPermission } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          <p className="text-sm text-ink-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  if (allowedRoles && role) {
    const userRoleNorm = normalizeRole(role);
    const hasRole = allowedRoles.some((r) => normalizeRole(r) === userRoleNorm);
    if (!hasRole) {
      return <Navigate to="/app" replace />;
    }
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
