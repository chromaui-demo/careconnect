import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@careconnect/types';
import { useAuth } from '../context/AuthContext';

export function useHasRole(roles: UserRole[]): boolean {
  const { user } = useAuth();
  return !!user && roles.includes(user.role);
}

interface RequireRoleProps {
  roles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

/** Route/section guard for role-gated content. Assumes it renders inside ProtectedRoute (auth already checked). */
export function RequireRole({ roles, children, fallback }: RequireRoleProps) {
  const ok = useHasRole(roles);
  if (!ok) return <>{fallback ?? <Navigate to="/visits" replace />}</>;
  return <>{children}</>;
}
