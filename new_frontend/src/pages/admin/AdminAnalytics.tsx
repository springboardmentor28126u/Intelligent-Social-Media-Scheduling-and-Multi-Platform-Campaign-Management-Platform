

import { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  PenTool,
  TrendingUp,
  Share2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  HardDrive,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import { Skeleton } from '@/components/common/Skeleton';
import { PlatformIcon } from '@/components/common/PlatformIcons';
import type { AdminAnalytics } from '@/types/admin';
import { getAdminAnalytics } from '@/services/admin';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const res = await getAdminAnalytics();
      setData(res);
    } catch (err) {
      console.error('Failed to load admin analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const stats = data?.stats;
  const totalUsers = stats?.total_users || 0;
  const adminPercentage = totalUsers > 0 ? Math.round(((stats?.admin_count || 0) / totalUsers) * 100) : 0;
  const creatorPercentage = totalUsers > 0 ? 100 - adminPercentage : 0;

  const totalPosts = stats?.total_posts || 0;
  const publishedCount = data?.post_status_distribution?.published || 0;
  const scheduledCount = data?.post_status_distribution?.scheduled || 0;
  const draftCount = data?.post_status_distribution?.draft || 0;
  const failedCount = data?.post_status_distribution?.failed || 0;

  const publishedPct = totalPosts > 0 ? Math.round((publishedCount / totalPosts) * 100) : 0;
  const scheduledPct = totalPosts > 0 ? Math.round((scheduledCount / totalPosts) * 100) : 0;
  const draftPct = totalPosts > 0 ? Math.round((draftCount / totalPosts) * 100) : 0;
  const failedPct = totalPosts > 0 ? Math.round((failedCount / totalPosts) * 100) : 0;

  // Max value in user growth for chart scaling
  const maxGrowthCount = Math.max(...(data?.user_growth?.map((g) => g.users) || [1]), 1);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Platform Analytics"
        description="Comprehensive metrics on user signups, content volume, role distributions, and social channels."
        action={
          <Button
            variant="outline"
            size="md"
            onClick={handleRefresh}
            disabled={refreshing}
            leftIcon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        }
      />

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <Users className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm text-ink-500">Registered Users</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-ink-900">{stats?.total_users ?? 0}</p>
          )}
          <p className="mt-1 text-xs text-ink-400">+{stats?.new_users_this_week ?? 0} in past 7 days</p>
        </Card>

        <Card className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm text-ink-500">Published Posts</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-ink-900">{stats?.published_posts ?? 0}</p>
          )}
          <p className="mt-1 text-xs text-ink-400">Across all connected channels</p>
        </Card>

        <Card className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
            <Share2 className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm text-ink-500">Connected Accounts</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-ink-900">{stats?.connected_accounts ?? 0}</p>
          )}
          <p className="mt-1 text-xs text-ink-400">Active social channels</p>
        </Card>

        <Card className="p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <HardDrive className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm text-ink-500">Media Library Storage</p>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-bold text-ink-900">{formatBytes(stats?.total_media_bytes)}</p>
          )}
          <p className="mt-1 text-xs text-ink-400">{stats?.total_media_count ?? 0} media assets</p>
        </Card>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* User Growth Trajectory Chart */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-brand-600" />
                <h3 className="text-base font-semibold text-ink-900">User Growth (Last 7 Days)</h3>
              </div>
              <Badge variant="brand">Registrations</Badge>
            </div>

            {loading ? (
              <div className="py-12 space-y-3">
                <Skeleton className="h-32 w-full rounded-xl" />
              </div>
            ) : (
              <div className="mt-6">
                {/* Visual Bar Chart */}
                <div className="flex items-end justify-between gap-3 h-44 pt-6 pb-2 border-b border-ink-100">
                  {(data?.user_growth || []).map((day) => {
                    const heightPercent = maxGrowthCount > 0 ? Math.max(12, (day.users / maxGrowthCount) * 100) : 12;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <span className="text-xs font-semibold text-ink-700">{day.users}</span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-lg transition-all ${day.users > 0 ? 'bg-brand-500 hover:bg-brand-600' : 'bg-ink-100'
                            }`}
                          title={`${day.date}: ${day.users} users`}
                        />
                        <span className="text-[11px] font-medium text-ink-400 truncate">{day.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-ink-400">
            Total of {stats?.new_users_this_week ?? 0} new users registered this week.
          </p>
        </Card>

        {/* Role & Access Distribution */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-ink-100 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-semibold text-ink-900">User Role Distribution</h3>
              </div>
              <Badge variant="neutral">{totalUsers} Total</Badge>
            </div>

            {loading ? (
              <div className="py-8 space-y-3">
                <Skeleton className="h-6 w-full rounded-full" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                {/* Combined Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-ink-700 mb-2">
                    <span>Creators ({creatorPercentage}%)</span>
                    <span>Admins ({adminPercentage}%)</span>
                  </div>
                  <div className="flex h-4 w-full overflow-hidden rounded-full bg-ink-100 p-0.5">
                    <div
                      style={{ width: `${creatorPercentage}%` }}
                      className="h-full rounded-full bg-emerald-500 transition-all"
                    />
                    <div
                      style={{ width: `${adminPercentage}%` }}
                      className="h-full rounded-full bg-brand-600 transition-all ml-0.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-ink-100 bg-emerald-50/40 p-4">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <PenTool className="h-4 w-4" />
                      <span className="text-xs font-semibold">Content Creators</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-ink-900">{stats?.creator_count ?? 0}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{creatorPercentage}% of all accounts</p>
                  </div>

                  <div className="rounded-xl border border-ink-100 bg-brand-50/40 p-4">
                    <div className="flex items-center gap-2 text-brand-700">
                      <Shield className="h-4 w-4" />
                      <span className="text-xs font-semibold">Administrators</span>
                    </div>
                    <p className="mt-2 text-2xl font-bold text-ink-900">{stats?.admin_count ?? 0}</p>
                    <p className="text-xs text-ink-400 mt-0.5">{adminPercentage}% of all accounts</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <p className="mt-4 text-xs text-ink-400">
            Admins have full platform management access; creators manage their campaigns.
          </p>
        </Card>
      </div>

      {/* Row 2: Post Status & Platform Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Post Status Distribution */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-600" />
              <h3 className="text-base font-semibold text-ink-900">Post Status Breakdown</h3>
            </div>
            <Badge variant="neutral">{totalPosts} Posts</Badge>
          </div>

          {loading ? (
            <div className="py-6 space-y-4">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {/* Published */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-ink-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    Published
                  </span>
                  <span className="text-ink-500 font-semibold">{publishedCount} ({publishedPct}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
                  <div style={{ width: `${publishedPct}%` }} className="h-full rounded-full bg-emerald-500" />
                </div>
              </div>

              {/* Scheduled */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-ink-700">
                    <Clock className="h-3.5 w-3.5 text-brand-600" />
                    Scheduled
                  </span>
                  <span className="text-ink-500 font-semibold">{scheduledCount} ({scheduledPct}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
                  <div style={{ width: `${scheduledPct}%` }} className="h-full rounded-full bg-brand-500" />
                </div>
              </div>

              {/* Draft */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-ink-700">
                    <FileText className="h-3.5 w-3.5 text-amber-600" />
                    Drafts
                  </span>
                  <span className="text-ink-500 font-semibold">{draftCount} ({draftPct}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
                  <div style={{ width: `${draftPct}%` }} className="h-full rounded-full bg-amber-500" />
                </div>
              </div>

              {/* Failed */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-ink-700">
                    <AlertTriangle className="h-3.5 w-3.5 text-danger-600" />
                    Failed
                  </span>
                  <span className="text-ink-500 font-semibold">{failedCount} ({failedPct}%)</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
                  <div style={{ width: `${failedPct}%` }} className="h-full rounded-full bg-danger-500" />
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Platform Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between border-b border-ink-100 pb-4">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-purple-600" />
              <h3 className="text-base font-semibold text-ink-900">Social Channel Distribution</h3>
            </div>
            <Badge variant="brand">{stats?.connected_accounts ?? 0} Connected</Badge>
          </div>

          {loading ? (
            <div className="py-6 space-y-3">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {(
                [
                  { key: 'linkedin', name: 'LinkedIn', color: 'bg-blue-600' },
                  { key: 'youtube', name: 'YouTube', color: 'bg-red-600' },
                  { key: 'instagram', name: 'Instagram', color: 'bg-pink-600' },
                  { key: 'facebook', name: 'Facebook', color: 'bg-blue-700' },
                  { key: 'x', name: 'X (Twitter)', color: 'bg-ink-900' },
                ] as const
              ).map((platform) => {
                const count = data?.platform_distribution?.[platform.key] || 0;
                return (
                  <div
                    key={platform.key}
                    className="flex items-center justify-between rounded-xl border border-ink-100 p-3 transition-colors hover:bg-ink-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-50">
                        <PlatformIcon platform={platform.key} className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold text-ink-900">{platform.name}</span>
                    </div>
                    <Badge variant={count > 0 ? 'brand' : 'neutral'}>
                      {count} {count === 1 ? 'account' : 'accounts'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
