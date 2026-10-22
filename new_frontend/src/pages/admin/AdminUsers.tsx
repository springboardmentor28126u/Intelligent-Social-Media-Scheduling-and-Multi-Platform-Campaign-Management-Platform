import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Loader2,
  ArrowUpDown,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronDown,
  ShieldCheck,
  Key,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import RolesAccessMatrix from '@/components/admin/RolesAccessMatrix';
import UserAccessModal from '@/components/admin/UserAccessModal';
import { useAuth } from '@/contexts/AuthContext';
import { deleteAdminUser } from '@/services/admin';
import {
  ALL_ROLES,
  ROLE_CONFIGS,
  normalizeRole,
  type RoleName,
} from '@/lib/permissions';

export default function AdminUsers() {
  const { profile: currentAdmin, users, updateUserRole, refreshUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'matrix'>('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | RoleName>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [selectedUserForAccess, setSelectedUserForAccess] = useState<{
    id: string;
    email: string | null;
    full_name?: string | null;
    role: string;
    created_at?: string;
  } | null>(null);

  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string | null; full_name?: string | null } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const userCounts = useMemo(() => {
    const counts: Record<RoleName, number> = {
      Administrator: 0,
      'Social Media Manager': 0,
      'Content Creator': 0,
      Analyst: 0,
    };
    users.forEach((u) => {
      const norm = normalizeRole(u.role);
      counts[norm] = (counts[norm] || 0) + 1;
    });
    return counts;
  }, [users]);

  const handleRoleChange = async (userId: string, newRole: RoleName) => {
    if (userId === currentAdmin?.id) {
      setErrorMsg("You can't change your own role");
      return;
    }
    setUpdatingId(userId);
    setErrorMsg(null);
    try {
      await updateUserRole(userId, newRole);
      setSuccessMsg(`User role updated to ${newRole} successfully.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      if (selectedUserForAccess && selectedUserForAccess.id === userId) {
        setSelectedUserForAccess((prev) => (prev ? { ...prev, role: newRole } : null));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user role');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeletingId(userToDelete.id);
    setErrorMsg(null);
    try {
      await deleteAdminUser(userToDelete.id);
      setSuccessMsg(`User ${userToDelete.email} removed.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      setUserToDelete(null);
      await refreshUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const userRole = normalizeRole(u.role);
    const matchesRole = roleFilter === 'all' || userRole === roleFilter;
    const matchesSearch =
      !search ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="User & Access Management"
        description="Manage user accounts, assign roles of access, and inspect Role-Based Access Control (RBAC) permissions."
      />

      {successMsg && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-success-500 hover:text-success-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-danger-500 hover:text-danger-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Tab Switcher: Users vs Roles of Access Matrix */}
      <div className="flex items-center gap-3 border-b border-ink-100 pb-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'users'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>User Accounts ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-all ${
            activeTab === 'matrix'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-ink-500 hover:text-ink-900'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Roles of Access (RBAC Matrix)</span>
        </button>
      </div>

      {activeTab === 'matrix' ? (
        <RolesAccessMatrix userCounts={userCounts} />
      ) : (
        <>
          {/* Role filter buttons & Search */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setRoleFilter('all')}
                className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all ${
                  roleFilter === 'all'
                    ? 'bg-ink-900 text-white shadow-sm'
                    : 'text-ink-600 hover:bg-ink-100'
                }`}
              >
                All Users ({users.length})
              </button>

              {ALL_ROLES.map((r) => {
                const count = userCounts[r];
                const config = ROLE_CONFIGS[r];
                const Icon = config.icon;
                return (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`flex items-center gap-1.5 shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                      roleFilter === r
                        ? 'bg-ink-900 text-white shadow-sm'
                        : 'text-ink-600 hover:bg-ink-100'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{config.label}</span>
                    <span className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] ${
                      roleFilter === r ? 'bg-white/20 text-white' : 'bg-ink-100 text-ink-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full rounded-xl border border-ink-100 bg-white py-2 pl-9 pr-4 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 sm:w-64"
              />
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="hidden grid-cols-[1.2fr_1fr_160px_120px_270px] gap-4 border-b border-ink-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink-400 sm:grid">
              <div className="flex items-center gap-1">
                User
                <ArrowUpDown className="h-3 w-3" />
              </div>
              <div>Email</div>
              <div>Current Role</div>
              <div>Registered</div>
              <div className="text-right">Roles of Access / Actions</div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={<Users className="h-7 w-7" />}
                title={search || roleFilter !== 'all' ? 'No users match your filters' : 'No users registered yet'}
                description={
                  search || roleFilter !== 'all'
                    ? 'Try adjusting your search or role filter.'
                    : 'Users will appear here once they register on SocialPilot.'
                }
              />
            ) : (
              <div className="divide-y divide-ink-50">
                {filtered.map((u) => {
                  const isCurrentAdmin = u.id === currentAdmin?.id;
                  const currentRole = normalizeRole(u.role);
                  const config = ROLE_CONFIGS[currentRole];
                  const Icon = config.icon;

                  return (
                    <div
                      key={u.id}
                      className="grid grid-cols-1 gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50/40 sm:grid-cols-[1.2fr_1fr_160px_120px_270px] sm:items-center sm:gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${config.bgClass} ${config.colorClass}`}
                        >
                          {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink-900">
                            {u.full_name || 'Unnamed user'}
                            {isCurrentAdmin && (
                              <span className="ml-1.5 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-ink-400 sm:hidden">{u.email || 'No email'}</p>
                        </div>
                      </div>

                      <p className="hidden truncate text-sm text-ink-500 sm:block">
                        {u.email || 'No email'}
                      </p>

                      <div>
                        <Badge variant={config.badgeVariant} dot>
                          <Icon className="mr-1 h-3 w-3 inline" />
                          {config.label}
                        </Badge>
                      </div>

                      <p className="hidden text-xs text-ink-400 sm:block">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : 'Joined'}
                      </p>

                      <div className="flex items-center justify-start sm:justify-end gap-2">
                        {/* Option of Roles of Access / View Permissions Modal */}
                        <button
                          onClick={() => setSelectedUserForAccess(u)}
                          className="flex items-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50/70 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                          title="View exact permissions and roles of access for this user"
                        >
                          <Key className="h-3.5 w-3.5 text-brand-600" />
                          <span>Access Rights</span>
                        </button>

                        {isCurrentAdmin ? (
                          <div
                            className="flex items-center gap-1 rounded-lg border border-ink-200 bg-ink-50/70 px-2.5 py-1.5 text-xs text-ink-500 cursor-not-allowed"
                            title="You cannot change your own role"
                          >
                            <Lock className="h-3 w-3 text-ink-400" />
                            <span className="hidden xl:inline">Role Locked</span>
                          </div>
                        ) : (
                          <div className="relative">
                            {updatingId === u.id ? (
                              <div className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-1.5 text-xs text-ink-500">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Updating...</span>
                              </div>
                            ) : (
                              <div className="relative inline-block text-left">
                                <select
                                  value={currentRole}
                                  disabled={updatingId === u.id}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value as RoleName)}
                                  className="appearance-none rounded-lg border border-ink-200 bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-ink-700 transition-colors hover:border-brand-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10 cursor-pointer"
                                  title="Change role of access"
                                >
                                  {ALL_ROLES.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                              </div>
                            )}
                          </div>
                        )}

                        {!isCurrentAdmin && (
                          <button
                            onClick={() => setUserToDelete({ id: u.id, email: u.email, full_name: u.full_name })}
                            className="flex items-center justify-center h-8 w-8 rounded-lg border border-danger-100 text-danger-500 hover:bg-danger-50 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* User Roles of Access Modal */}
      {selectedUserForAccess && (
        <UserAccessModal
          user={selectedUserForAccess}
          isCurrentAdmin={selectedUserForAccess.id === currentAdmin?.id}
          onClose={() => setSelectedUserForAccess(null)}
          onRoleChange={handleRoleChange}
        />
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-danger-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-50">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-ink-900">Delete User Account</h3>
            </div>
            <p className="text-sm text-ink-600">
              Are you sure you want to permanently delete{' '}
              <span className="font-semibold text-ink-900">{userToDelete.email}</span>?
              All associated posts, campaigns, and media for this user will be removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                onClick={() => setUserToDelete(null)}
                disabled={Boolean(deletingId)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                onClick={handleDeleteUser}
                disabled={Boolean(deletingId)}
                leftIcon={deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              >
                {deletingId ? 'Deleting...' : 'Delete User'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
