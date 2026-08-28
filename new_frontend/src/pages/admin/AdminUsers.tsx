import { useState } from 'react';
import {
  Users,
  Search,
  Shield,
  PenTool,
  Loader2,
  ArrowUpDown,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminUsers() {
  const { profile: currentAdmin, users, toggleUserRole } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'creator'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleToggleRole = async (userId: string) => {
    if (userId === currentAdmin?.id) return;
    setUpdatingId(userId);
    await new Promise((r) => setTimeout(r, 400));
    toggleUserRole(userId);
    setUpdatingId(null);
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
        description="View and manage all users on your platform."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {(['all', 'admin', 'creator'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium capitalize transition-all ${
                roleFilter === f ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              {f === 'all' ? 'All Users' : f === 'admin' ? 'Admins' : 'Creators'}
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
            className="w-full rounded-xl border border-ink-100 bg-white py-2.5 pl-10 pr-4 text-sm text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 sm:w-64"
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden grid-cols-[1fr_1fr_140px_140px_120px] gap-4 border-b border-ink-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-ink-400 sm:grid">
          <div className="flex items-center gap-1">
            User
            <ArrowUpDown className="h-3 w-3" />
          </div>
          <div>Email</div>
          <div>Role</div>
          <div>Joined</div>
          <div className="text-right">Actions</div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-7 w-7" />}
            title={search || roleFilter !== 'all' ? 'No users match your filters' : 'No users yet'}
            description={
              search || roleFilter !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Users will appear here once they sign up.'
            }
          />
        ) : (
          <div className="divide-y divide-ink-50">
            {filtered.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-1 gap-3 px-5 py-3.5 transition-colors hover:bg-ink-50/40 sm:grid-cols-[1fr_1fr_140px_140px_120px] sm:items-center sm:gap-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                      u.role === 'admin' ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-600'
                    }`}
                  >
                    {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {u.full_name || 'Unnamed user'}
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

                <p className="hidden text-sm text-ink-400 sm:block">
                  {new Date(u.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>

                <div className="flex justify-start sm:justify-end">
                  <button
                    onClick={() => handleToggleRole(u.id)}
                    disabled={updatingId === u.id || u.id === currentAdmin?.id}
                    className="flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-ink-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    title={
                      u.id === currentAdmin?.id
                        ? "You can't change your own role"
                        : `Make ${u.role === 'admin' ? 'creator' : 'admin'}`
                    }
                  >
                    {updatingId === u.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : u.role === 'admin' ? (
                      <>
                        <PenTool className="h-3.5 w-3.5" />
                        Make Creator
                      </>
                    ) : (
                      <>
                        <Shield className="h-3.5 w-3.5" />
                        Make Admin
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
