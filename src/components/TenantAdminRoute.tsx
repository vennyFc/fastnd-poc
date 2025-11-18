import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function TenantAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isTenantAdmin, isSuperAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isTenantAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
