import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/supabase';

type Props = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
};

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, role, loading } = useAuth();

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

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
