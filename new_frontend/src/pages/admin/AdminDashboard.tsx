import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Shield,
  PenTool,
  TrendingUp,
  ArrowRight,
  CalendarDays,
  Link2,
  FolderKanban,
  HardDrive,
  Settings,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import type { AdminStats } from '@/types/admin';
import { getAdminStats } from '@/services/admin';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AdminDashboard() {
  const { profile, users } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setLoadingStats(true);
        const data = await getAdminStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
  }, []);

  const totalUsers = stats?.total_users ?? users.length;
  const creatorCount = stats?.creator_count ?? users.filter((u) => u.role === 'creator').length;
  const adminCount = stats?.admin_count ?? users.filter((u) => u.role === 'admin').length;
  const newThisWeek = stats?.new_users_this_week ?? 0;

  const topKPIs = [
    { icon: Users, label: 'Total Users', value: totalUsers, color: 'text-brand-600', bg: 'bg-brand-50' },
    { icon: PenTool, label: 'Content Creators', value: creatorCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { icon: Shield, label: 'Administrators', value: adminCount, color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: TrendingUp, label: 'New This Week', value: newThisWeek, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const quickActions = [
    { icon: Users, label: 'Manage Users', to: '/admin/users', desc: 'View, filter, and change user roles' },
    { icon: TrendingUp, label: 'Platform Analytics', to: '/admin/analytics', desc: 'Deep dive into growth and post metrics' },
    { icon: Settings, label: 'Admin Settings', to: '/admin/settings', desc: 'Configure platform rules and upload limits' },
    { icon: ImageIcon, label: 'Media Library', to: '/app/media', desc: 'Explore all user uploaded media assets' },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Admin Dashboard"
        description={`Welcome back${profile?.full_name ? `, ${profile.full_name}` : ''}. Here is a live overview of platform health and activity.`}
        action={
          <Button to="/admin/users" variant="secondary" size="md" leftIcon={<Users className="h-4 w-4" />}>
            Manage Users
          </Button>
        }
      />

      {/* Top 4 KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {topKPIs.map((kpi) => (
          <Card key={kpi.label} className="p-5">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${kpi.bg} ${kpi.color}`}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-500">{kpi.label}</p>
            {loadingStats ? (
              <Skeleton className="mt-1.5 h-8 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-ink-900">{kpi.value}</p>
            )}
          </Card>
        ))}
      </div>

      {/* Main Grid: Recent Users & Platform Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div className="flex items-center gap-2.5">
                <Users className="h-5 w-5 text-ink-700" />
                <h3 className="text-base font-semibold text-ink-900">Recent Platform Users</h3>
              </div>
              <Link to="/admin/users" className="text-sm font-semibold text-brand-600 hover:text-brand-700">
                View all ({users.length})
              </Link>
            </div>

            {users.length === 0 ? (
              <EmptyState
                compact
                icon={<Users className="h-6 w-6" />}
                title="No users registered yet"
                description="Users will appear here as they register on SocialPilot."
              />
            ) : (
              <div className="mt-4 space-y-2">
                {users.slice(0, 6).map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 p-3.5 transition-colors hover:bg-ink-50/50"
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
                        </p>
                        <p className="truncate text-xs text-ink-400">{u.email || 'No email'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={u.role === 'admin' ? 'brand' : 'neutral'} dot>
                        {u.role === 'admin' ? 'Administrator' : 'Creator'}
                      </Badge>
                      <Link to="/admin/users">
                        <span className="text-xs text-ink-400 hover:text-brand-600 font-medium">Manage</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions & Platform Live Metrics */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-base font-semibold text-ink-900 border-b border-ink-100 pb-3">Quick Navigation</h3>
            <div className="mt-4 space-y-2.5">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="group flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition-all hover:border-brand-200 hover:bg-brand-50/30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white transition-transform group-hover:scale-105 group-hover:bg-brand-600">
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900 group-hover:text-brand-700">{a.label}</p>
                    <p className="text-xs text-ink-400 truncate">{a.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-base font-semibold text-ink-900 border-b border-ink-100 pb-3">Platform Status</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-600">
                  <Link2 className="h-4 w-4 text-brand-600" />
                  Connected Accounts
                </div>
                <Badge variant="brand">{stats?.connected_accounts ?? 0}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-600">
                  <CalendarDays className="h-4 w-4 text-purple-600" />
                  Total Posts Created
                </div>
                <Badge variant="neutral">{stats?.total_posts ?? 0}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-600">
                  <FolderKanban className="h-4 w-4 text-emerald-600" />
                  Active Campaigns
                </div>
                <Badge variant="neutral">{stats?.active_campaigns ?? 0}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-ink-600">
                  <HardDrive className="h-4 w-4 text-amber-600" />
                  Media Assets & Storage
                </div>
                <Badge variant="neutral">
                  {stats?.total_media_count ?? 0} files ({formatBytes(stats?.total_media_bytes)})
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
