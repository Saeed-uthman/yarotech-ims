import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  ShieldAlert, 
  Ban, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Shield, 
  Eye, 
  ArrowUpRight, 
  Check, 
  AlertCircle,
  Sparkles,
  Phone,
  Mail,
  UserX,
  Lock,
  ChevronRight,
  ShieldOff
} from 'lucide-react';
import { UserAccount, UserRole, AccountStatus, UserFilterParams } from '../../types';
import { authService } from '../../services/authService';
import { useAuth } from '../../hooks';
import { ApproveUserModal } from './ApproveUserModal';
import { RejectUserModal } from './RejectUserModal';
import { SuspendUserModal } from './SuspendUserModal';
import { UserDetailsModal } from './UserDetailsModal';

interface UserManagementModuleProps {
  role: UserRole;
  onNavigateToProducts?: () => void;
}

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({
  role,
  onNavigateToProducts,
}) => {
  const { user: currentUser, refreshPendingCount } = useAuth();

  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Modals state
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<UserAccount | null>(null);
  const [userToApprove, setUserToApprove] = useState<UserAccount | null>(null);
  const [userToReject, setUserToReject] = useState<UserAccount | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<UserAccount | null>(null);

  // Fetch users from service
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await authService.getUsers({
        search: searchQuery,
        status: statusFilter,
        role: roleFilter,
      });
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch user accounts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Derived KPI stats
  const totalUsers = users.length;
  const pendingUsers = users.filter((u) => u.status === 'PENDING');
  const activeUsers = users.filter((u) => u.status === 'ACTIVE');
  const suspendedUsers = users.filter((u) => u.status === 'SUSPENDED');
  const rejectedUsers = users.filter((u) => u.status === 'REJECTED');

  // Displayed list based on active tab
  const displayedUsers = activeTab === 'pending'
    ? pendingUsers
    : users;

  // Handle Actions
  const handleApproveConfirm = async (userId: string, assignedRole: UserRole) => {
    try {
      setIsActionLoading(true);
      const res = await authService.approveUser({
        userId,
        approvedBy: currentUser?.fullName || 'System Administrator',
        assignedRole,
      });
      if (res.success) {
        setUserToApprove(null);
        await fetchUsers();
        await refreshPendingCount();
      }
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRejectConfirm = async (userId: string, reason: string) => {
    try {
      setIsActionLoading(true);
      const res = await authService.rejectUser({
        userId,
        rejectedBy: currentUser?.fullName || 'System Administrator',
        reason,
      });
      if (res.success) {
        setUserToReject(null);
        await fetchUsers();
        await refreshPendingCount();
      }
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSuspendConfirm = async (userId: string) => {
    try {
      setIsActionLoading(true);
      const res = await authService.suspendUser({
        userId,
        suspendedBy: currentUser?.fullName || 'System Administrator',
      });
      if (res.success) {
        setUserToSuspend(null);
        await fetchUsers();
      }
    } catch (err) {
      console.error('Suspension failed:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      setIsActionLoading(true);
      const res = await authService.reactivateUser({
        userId,
        reactivatedBy: currentUser?.fullName || 'System Administrator',
      });
      if (res.success) {
        await fetchUsers();
      }
    } catch (err) {
      console.error('Reactivation failed:', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Role Gate: Only ADMIN can view this module
  if (role !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4 animate-in fade-in">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Administrator Access Required
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            The User Accounts & Registration Approval module is restricted to administrators. Switch to Administrator role to review pending applications.
          </p>
        </div>
        {onNavigateToProducts && (
          <button
            onClick={onNavigateToProducts}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs"
          >
            Return to Products Catalog
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Module Header & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              User Accounts & Admin Approvals
            </h1>
            {pendingUsers.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                {pendingUsers.length} Pending
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review registration requests, approve staff credentials, and manage system roles.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-800 shadow-xs transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Pending Approvals */}
        <div 
          onClick={() => setActiveTab('pending')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'pending'
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Pending Approvals
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900 dark:text-amber-200">
              {pendingUsers.length}
            </span>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 font-medium">
              awaiting review
            </span>
          </div>
        </div>

        {/* Active Staff */}
        <div 
          onClick={() => {
            setActiveTab('all');
            setStatusFilter('ACTIVE');
          }}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 cursor-pointer transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Active Staff
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {activeUsers.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              authorized
            </span>
          </div>
        </div>

        {/* Suspended Accounts */}
        <div 
          onClick={() => {
            setActiveTab('all');
            setStatusFilter('SUSPENDED');
          }}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 cursor-pointer transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Suspended
            </span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {suspendedUsers.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              locked accounts
            </span>
          </div>
        </div>

        {/* Total Registered Accounts */}
        <div 
          onClick={() => {
            setActiveTab('all');
            setStatusFilter('all');
          }}
          className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 cursor-pointer transition-all shadow-xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Total Accounts
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {totalUsers}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              in registry
            </span>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Header */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          {/* Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'pending'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>Pending Requests</span>
              {pendingUsers.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-mono">
                  {pendingUsers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>All Staff Accounts</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                {totalUsers}
              </span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, phone..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Secondary Filter Row (visible on "All" tab) */}
        {activeTab === 'all' && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Filter By:
            </span>

            {/* Status Selector */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Role Selector */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrator</option>
              <option value="cashier">Cashier</option>
            </select>

            {(statusFilter !== 'all' || roleFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setRoleFilter('all');
                  setSearchQuery('');
                }}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline ml-auto font-medium"
              >
                Reset Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Users List (Table on Desktop, Cards on Mobile) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {displayedUsers.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {activeTab === 'pending' ? 'No Pending Approvals' : 'No Accounts Found'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {activeTab === 'pending'
                  ? 'All user registrations have been reviewed. New applications will appear here automatically.'
                  : 'Try adjusting your search query or status filter.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Contact Info</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Registration Date</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs ${
                            user.role === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'
                          }`}>
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {user.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {user.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Phone className="w-3 h-3" />
                            <span>{user.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold ${
                          user.role === 'admin'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {user.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        )}
                        {user.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending
                          </span>
                        )}
                        {user.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                            <Ban className="w-3 h-3" />
                            Declined
                          </span>
                        )}
                        {user.status === 'SUSPENDED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                            <ShieldAlert className="w-3 h-3" />
                            Suspended
                          </span>
                        )}
                      </td>

                      {/* Registration Date */}
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {user.status === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => setUserToApprove(user)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold text-[11px] transition-colors shadow-xs"
                                title="Approve Registration"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Approve</span>
                              </button>

                              <button
                                onClick={() => setUserToReject(user)}
                                className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-md font-semibold text-[11px] transition-colors"
                                title="Decline Registration"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </>
                          ) : user.status === 'ACTIVE' ? (
                            <button
                              onClick={() => setUserToSuspend(user)}
                              className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-md font-medium text-[11px] transition-colors"
                              title="Suspend Account"
                            >
                              Suspend
                            </button>
                          ) : user.status === 'SUSPENDED' ? (
                            <button
                              onClick={() => handleReactivate(user.id)}
                              className="px-2 py-1 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-md font-semibold text-[11px] transition-colors"
                              title="Reactivate Account"
                            >
                              Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => setUserToApprove(user)}
                              className="px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md font-semibold text-[11px] transition-colors"
                              title="Re-approve Account"
                            >
                              Re-approve
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedUserForDetails(user)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                            title="View Full Profile & Audit History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {displayedUsers.map((user) => (
                <div key={user.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs ${
                        user.role === 'admin' ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}>
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {user.fullName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono">{user.email}</p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {user.status === 'ACTIVE' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      )}
                      {user.status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                          Pending
                        </span>
                      )}
                      {user.status === 'REJECTED' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Declined
                        </span>
                      )}
                      {user.status === 'SUSPENDED' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                          Suspended
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50 dark:border-slate-800">
                    <span className="font-mono uppercase font-bold text-[10px] text-slate-400">
                      Role: {user.role}
                    </span>
                    <span>
                      {new Date(user.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    {user.status === 'PENDING' ? (
                      <>
                        <button
                          onClick={() => setUserToApprove(user)}
                          className="flex-1 py-1.5 px-3 bg-emerald-600 text-white rounded-lg font-bold text-xs shadow-xs text-center"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setUserToReject(user)}
                          className="py-1.5 px-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg font-bold text-xs"
                        >
                          Reject
                        </button>
                      </>
                    ) : user.status === 'ACTIVE' ? (
                      <button
                        onClick={() => setUserToSuspend(user)}
                        className="py-1 px-3 text-xs text-slate-600 bg-slate-100 rounded-lg font-medium"
                      >
                        Suspend
                      </button>
                    ) : user.status === 'SUSPENDED' ? (
                      <button
                        onClick={() => handleReactivate(user.id)}
                        className="py-1 px-3 text-xs text-emerald-700 bg-emerald-50 rounded-lg font-bold"
                      >
                        Reactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => setUserToApprove(user)}
                        className="py-1 px-3 text-xs text-blue-600 bg-blue-50 rounded-lg font-bold"
                      >
                        Re-approve
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedUserForDetails(user)}
                      className="p-1.5 text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg"
                      aria-label="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Approve Modal */}
      <ApproveUserModal
        isOpen={!!userToApprove}
        user={userToApprove}
        isLoading={isActionLoading}
        onClose={() => setUserToApprove(null)}
        onConfirm={handleApproveConfirm}
      />

      {/* Reject Modal */}
      <RejectUserModal
        isOpen={!!userToReject}
        user={userToReject}
        isLoading={isActionLoading}
        onClose={() => setUserToReject(null)}
        onConfirm={handleRejectConfirm}
      />

      {/* Suspend Modal */}
      <SuspendUserModal
        isOpen={!!userToSuspend}
        user={userToSuspend}
        isLoading={isActionLoading}
        onClose={() => setUserToSuspend(null)}
        onConfirm={handleSuspendConfirm}
      />

      {/* Details Modal */}
      <UserDetailsModal
        isOpen={!!selectedUserForDetails}
        user={selectedUserForDetails}
        onClose={() => setSelectedUserForDetails(null)}
      />
    </div>
  );
};
