import { useState } from 'react';
import {
  Users,
  Search,
  Shield,
  PenTool,
  Loader2,
  ArrowUpDown,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { deleteAdminUser } from '@/services/admin';

export default function AdminUsers() {
  const { profile: currentAdmin, users, toggleUserRole, signOut } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'creator'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string | null; full_name?: string | null } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleToggleRole = async (userId: string) => {
    if (userId === currentAdmin?.id) return;
    setUpdatingId(userId);
    setErrorMsg(null);
    try {
      await toggleUserRole(userId);
      setSuccessMsg('User role updated successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
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
      // Reload page or let context refresh
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesSearch =
      !search ||
      (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="User Management"
        description="View and manage all registered creators, business users, and platform administrators."
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {(['all', 'admin', 'creator'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-medium capitalize transition-all ${
                roleFilter === f ? 'bg-ink-900 text-white shadow-sm' : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              {f === 'all' ? `All Users (${users.length})` : f === 'admin' ? 'Admins' : 'Creators'}
            </button>
          ))}
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
        <div className="hidden grid-cols-[1fr_1fr_130px_130px_160px] gap-4 border-b border-ink-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink-400 sm:grid">
          <div className="flex items-center gap-1">
            User
            <ArrowUpDown className="h-3 w-3" />
          </div>
          <div>Email</div>
          <div>Role</div>
          <div>Registered</div>
          <div className="text-right">Actions</div>
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
              return (
                <div
                  key={u.id}
                  className="grid grid-cols-1 gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50/40 sm:grid-cols-[1fr_1fr_130px_130px_160px] sm:items-center sm:gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                        u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-600'
                      }`}
                    >
                      {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {u.full_name || 'Unnamed user'}
                        {isCurrentAdmin && (
                          <span className="ml-1.5 text-xs text-brand-600 font-normal">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-ink-400 sm:hidden">{u.email || 'No email'}</p>
                    </div>
                  </div>

                  <p className="hidden truncate text-sm text-ink-500 sm:block">
                    {u.email || 'No email'}
                  </p>

                  <div>
                    <Badge variant={u.role === 'admin' ? 'brand' : 'neutral'} dot>
                      {u.role === 'admin' ? 'Admin' : 'Creator'}
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
                    <button
                      onClick={() => handleToggleRole(u.id)}
                      disabled={updatingId === u.id || isCurrentAdmin}
                      className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      title={
                        isCurrentAdmin
                          ? "You cannot change your own role"
                          : `Switch role to ${u.role === 'admin' ? 'Creator' : 'Admin'}`
                      }
                    >
                      {updatingId === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : u.role === 'admin' ? (
                        <>
                          <PenTool className="h-3.5 w-3.5" />
                          To Creator
                        </>
                      ) : (
                        <>
                          <Shield className="h-3.5 w-3.5" />
                          To Admin
                        </>
                      )}
                    </button>

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
