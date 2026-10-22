import { useState } from 'react';
import {
  Check,
  X,
  Shield,
  Briefcase,
  PenTool,
  BarChart3,
  Search,
  Filter,
  Info,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import {
  ALL_ROLES,
  ROLE_CONFIGS,
  PERMISSION_CONFIGS,
  PERMISSION_CATEGORIES,
  PERMISSIONS,
  type RoleName,
  type PermissionCategory,
} from '@/lib/permissions';

export default function RolesAccessMatrix({
  userCounts,
}: {
  userCounts?: Record<RoleName, number>;
}) {
  const [selectedCategory, setSelectedCategory] = useState<'All' | PermissionCategory>('All');
  const [search, setSearch] = useState('');

  const filteredPermissions = PERMISSION_CONFIGS.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      !search ||
      p.label.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.key.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* 4 Role Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ALL_ROLES.map((r) => {
          const config = ROLE_CONFIGS[r];
          const Icon = config.icon;
          const count = userCounts ? userCounts[r] || 0 : undefined;
          const permCount = config.permissionCount;

          return (
            <Card key={r} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bgClass} ${config.colorClass}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant={config.badgeVariant}>
                    {permCount}/12 Access Rights
                  </Badge>
                </div>
                <h4 className="mt-3 text-base font-semibold text-ink-900">{config.label}</h4>
                <p className="mt-1 text-xs text-ink-500 leading-relaxed">{config.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between text-xs text-ink-400">
                <span>Active Users</span>
                <span className="font-semibold text-ink-800">{count !== undefined ? count : '—'}</span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedCategory === 'All'
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              All Privileges ({PERMISSION_CONFIGS.length})
            </button>
            {PERMISSION_CATEGORIES.map((cat) => {
              const count = PERMISSION_CONFIGS.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-ink-900 text-white shadow-sm'
                      : 'text-ink-600 hover:bg-ink-100'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search privileges..."
              className="w-full rounded-xl border border-ink-100 bg-white py-1.5 pl-8 pr-3 text-xs text-ink-700 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 sm:w-56"
            />
          </div>
        </div>

        {/* Access Matrix Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-ink-100">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/70 text-xs font-semibold text-ink-600 uppercase tracking-wider">
                <th className="py-3 px-4 min-w-[220px]">Capability & Access Key</th>
                <th className="py-3 px-4 min-w-[140px]">Category</th>
                {ALL_ROLES.map((r) => {
                  const config = ROLE_CONFIGS[r];
                  const Icon = config.icon;
                  return (
                    <th key={r} className="py-3 px-3 text-center min-w-[130px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{r}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 text-xs">
              {filteredPermissions.map((perm) => (
                <tr key={perm.key} className="hover:bg-ink-50/40 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-ink-900">{perm.label}</p>
                    <p className="text-[11px] text-ink-400 mt-0.5">{perm.description}</p>
                    <code className="mt-1 inline-block rounded bg-ink-100/70 px-1.5 py-0.2 text-[10px] text-ink-600 font-mono">
                      {perm.key}
                    </code>
                  </td>

                  <td className="py-3 px-4">
                    <span className="inline-block rounded-md bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-700">
                      {perm.category}
                    </span>
                  </td>

                  {ALL_ROLES.map((r) => {
                    const isAllowed = PERMISSIONS[r]?.has(perm.key) ?? false;
                    return (
                      <td key={r} className="py-3 px-3 text-center">
                        {isAllowed ? (
                          <div className="inline-flex items-center justify-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 border border-emerald-200">
                            <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
                            <span className="text-[11px] font-semibold">Allowed</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-center gap-1 rounded-full bg-ink-50 px-2.5 py-1 text-ink-400 border border-ink-100">
                            <X className="h-3 w-3 text-ink-400" />
                            <span className="text-[11px]">Denied</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Security Policy Note */}
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-ink-50 p-3 text-xs text-ink-500">
          <Info className="h-4 w-4 shrink-0 text-brand-600 mt-0.5" />
          <p>
            Role-Based Access Control is enforced server-side. Users automatically inherit their access permissions based on their assigned role. Changing a user's role immediately grants or revokes these capabilities.
          </p>
        </div>
      </Card>
    </div>
  );
}
