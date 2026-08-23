import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  UserCheck, 
  ShieldAlert, 
  ChevronDown, 
  Settings, 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  Check, 
  Sparkles,
  HelpCircle,
  LogOut,
  Users,
  Clock,
  Keyboard
} from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../hooks';

interface HeaderUserMenuProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onNavigate?: (nav: string) => void;
  onOpenShortcuts?: () => void;
  isOnline?: boolean;
}

export const HeaderUserMenu: React.FC<HeaderUserMenuProps> = ({
  currentRole,
  onRoleChange,
  onNavigate,
  onOpenShortcuts,
  isOnline = true,
}) => {
  const { user, logout, pendingCount } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleRoleSelect = (newRole: UserRole) => {
    onRoleChange(newRole);
    setIsOpen(false);
  };

  const handleNavClick = (nav: string) => {
    if (onNavigate) {
      onNavigate(nav);
      setIsOpen(false);
    }
  };

  const handleSignOut = () => {
    setIsOpen(false);
    logout();
  };

  const displayName = user?.fullName || (currentRole === 'admin' ? 'Dr. Abdullahi Sanusi' : 'Dispensary Cashier');
  const displayEmail = user?.email || (currentRole === 'admin' ? 'admin@alamaan.test' : 'cashier@alamaan.test');

  return (
    <div className="relative">
      {/* Profile Trigger Button */}
      <button
        ref={triggerRef}
        id="header-user-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`User menu for ${currentRole === 'admin' ? 'Administrator' : 'Cashier'}`}
        className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-lg border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px] sm:min-h-[44px] ${
          isOpen
            ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-xs'
        }`}
      >
        {/* User Avatar with Status Indicator */}
        <div className="relative shrink-0">
          <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center font-bold text-xs shadow-xs text-white ${
            currentRole === 'admin' 
              ? 'bg-blue-600 dark:bg-blue-600' 
              : 'bg-emerald-600 dark:bg-emerald-600'
          }`}>
            {currentRole === 'admin' ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <User className="w-4 h-4" />
            )}
          </div>
          {/* Network dot indicator */}
          <span 
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
              isOnline ? 'bg-emerald-500' : 'bg-rose-500'
            }`} 
            title={isOnline ? 'Online - Live Sync Active' : 'Offline Mode'}
          />
        </div>

        {/* User Info (Hidden on mobile, visible on desktop) */}
        <div className="hidden xl:block text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-900 dark:text-white leading-none truncate max-w-[120px]">
              {displayName}
            </span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
              currentRole === 'admin'
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
            }`}>
              {currentRole}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
            {currentRole === 'admin' ? 'System Administrator' : 'Dispensary & POS'}
          </p>
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 hidden sm:block ${
          isOpen ? 'rotate-180 text-slate-600 dark:text-slate-200' : ''
        }`} />
      </button>

      {/* User Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="User account and role options"
          className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100 dark:divide-slate-800"
        >
          {/* User Profile Header Card */}
          <div className="p-4 bg-slate-50/80 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white shadow-xs ${
                currentRole === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'
              }`}>
                {currentRole === 'admin' ? (
                  <UserCheck className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {displayName}
                  </h4>
                  <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                    currentRole === 'admin'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                  }`}>
                    {currentRole}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {displayEmail}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <span className="font-medium">
                  {isOnline ? 'Online (Connected)' : 'Offline (Local Cache)'}
                </span>
              </div>

              {currentRole === 'admin' && pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse">
                  {pendingCount} Pending Approvals
                </span>
              )}
            </div>
          </div>

          {/* Quick Role Switcher Section */}
          <div className="p-3">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-2">
              Switch Active Role (Testing Mode)
            </label>
            
            <div className="space-y-1.5">
              {/* Admin Option */}
              <button
                role="menuitem"
                onClick={() => handleRoleSelect('admin')}
                className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors ${
                  currentRole === 'admin'
                    ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 shrink-0 mt-0.5">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Administrator
                    </span>
                    {currentRole === 'admin' && (
                      <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Full access to costs, catalog, user approvals, and accounting.
                  </p>
                </div>
              </button>

              {/* Cashier Option */}
              <button
                role="menuitem"
                onClick={() => handleRoleSelect('cashier')}
                className={`w-full flex items-start gap-3 p-2.5 rounded-lg text-left transition-colors ${
                  currentRole === 'cashier'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Cashier Mode
                    </span>
                    {currentRole === 'cashier' && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Streamlined POS sales view. Wholesale base costs securely masked.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick System Navigation Shortcuts */}
          <div className="p-2 space-y-0.5">
            {currentRole === 'admin' && (
              <button
                role="menuitem"
                onClick={() => handleNavClick('users')}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-700 dark:text-blue-300">Staff Accounts & Approvals</span>
                </div>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white font-mono">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            <button
              role="menuitem"
              onClick={() => handleNavClick('settings')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>System Preferences & Settings</span>
            </button>

            <button
              role="menuitem"
              onClick={() => handleNavClick('accountability')}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>Accountability & Shift Logs</span>
            </button>

            {onOpenShortcuts && (
              <button
                role="menuitem"
                onClick={() => {
                  setIsOpen(false);
                  onOpenShortcuts();
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Keyboard className="w-4 h-4 text-slate-400" />
                  <span>Keyboard Shortcuts</span>
                </div>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 rounded border border-slate-200 dark:border-slate-700">
                  ?
                </kbd>
              </button>
            )}
          </div>

          {/* Sign Out Button */}
          <div className="p-2 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              role="menuitem"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
