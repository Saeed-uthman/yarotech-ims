import React from 'react';
import { UserRole } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { ShieldAlert, ArrowLeft, ShoppingBag, LayoutDashboard } from 'lucide-react';

interface RoleGuardProps {
  allowedRoles?: UserRole[];
  requireAdmin?: boolean;
  roleOverride?: UserRole;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  requireAdmin = false,
  roleOverride,
  fallback = null,
  children,
}) => {
  const permissions = usePermissions(roleOverride);

  let isAllowed = true;

  if (requireAdmin) {
    isAllowed = permissions.isAdmin;
  } else if (allowedRoles && allowedRoles.length > 0) {
    isAllowed = allowedRoles.includes(permissions.role);
  }

  if (!isAllowed) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
};

interface AccessDeniedCardProps {
  title?: string;
  message?: string;
  requiredRole?: string;
  onReturn?: () => void;
  returnLabel?: string;
}

export const AccessDeniedCard: React.FC<AccessDeniedCardProps> = ({
  title = 'Restricted Access',
  message = 'This module is restricted to Administrators. Cashiers do not have permission to view or manage financial ledgers, system settings, or procurement records.',
  requiredRole = 'Administrator',
  onReturn,
  returnLabel = 'Return to Point of Sale',
}) => {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-6" id="role-access-denied-container">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 text-center shadow-sm space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-100 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-2xs">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[11px] font-bold tracking-wide uppercase">
            {requiredRole} Permission Required
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {message}
          </p>
        </div>

        {onReturn && (
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <button
              type="button"
              id="return-from-access-denied-btn"
              onClick={onReturn}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{returnLabel}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
