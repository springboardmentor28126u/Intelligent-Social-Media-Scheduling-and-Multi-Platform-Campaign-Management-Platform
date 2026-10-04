import { useState, useEffect } from 'react';
import {
  CalendarDays,
  FolderKanban,
  Link2,
  BarChart3,
  PenSquare,
  Plus,
  ArrowRight,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Loader2,
  Heart,
  MessageSquare,
  Eye,
  TrendingUp,
  Share2,
  Video,
  Repeat,
  History,
  X,
  FileText,
  ChevronRight,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import EmptyState from '@/components/common/EmptyState';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { Skeleton } from '@/components/common/Skeleton';
import { platforms, PlatformIcon } from '@/components/common/PlatformIcons';
import {
  type PostOut,
  type PublishLogOut,
  backendPlatformToKey,
  getPostStatusBadgeVariant,
  getPlatformStatusBadgeVariant,
  formatDateTime,
} from '@/types/post';
import type { CampaignOut } from '@/types/campaign';
import type { OverviewAnalytics } from '@/types/analytics';

const API_BASE = 'http://localhost:8000';

interface SocialAccountData {
  id: number;
  platform: string;
  account_name: string;
  status: string;
}

function getPostTimingLabel(post: PostOut): string {
  if (post.scheduled_time) {
    return `Scheduled for ${formatDateTime(post.scheduled_time)}`;
  }
  const statusLower = post.status.toLowerCase();
  if (statusLower === 'publishing' || statusLower === 'scheduled') {
    return 'Publishing now...';
  }
  if (statusLower === 'draft') {
    return 'Draft (No schedule)';
  }
  if (post.created_at) {
    return `Immediate (${formatDateTime(post.created_at)})`;
  }
  return 'Immediate publish';
}

const quickActions = [
  { icon: PenSquare, label: 'Create Post', to: '/app/create', desc: 'Compose and schedule' },
  { icon: FolderKanban, label: 'New Campaign', to: '/app/campaigns', desc: 'Start a campaign' },
  { icon: Link2, label: 'Connect Account', to: '/app/accounts', desc: 'Link a platform' },
  { icon: CalendarDays, label: 'View Calendar', to: '/app/calendar', desc: 'See schedule' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [posts, setPosts] = useState<PostOut[]>([]);
  const [accounts, setAccounts] = useState<SocialAccountData[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOut[]>([]);
  const [analytics, setAnalytics] = useState<OverviewAnalytics | null>(null);

  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Publish logs modal state
  const [activeLogPost, setActiveLogPost] = useState<PostOut | null>(null);
  const [postLogs, setPostLogs] = useState<PublishLogOut[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    if (!token) {
      setLoadingPosts(false);
      setLoadingAccounts(false);
      setLoadingCampaigns(false);
      setLoadingAnalytics(false);
      return;
    }

    const headers = { Authorization: `Bearer ${token}` };

    // 1. Fetch Posts
    fetch(`${API_BASE}/posts/`, { headers })
      .then(async (res) => {
        if (res.ok) {
          const data: PostOut[] = await res.json();
          setPosts(data);
        }
      })
      .catch((err) => console.error('Error fetching posts:', err))
      .finally(() => setLoadingPosts(false));

    // 2. Fetch Connected Social Accounts
    fetch(`${API_BASE}/social-accounts`, { headers })
      .then(async (res) => {
        if (res.ok) {
          const data: SocialAccountData[] = await res.json();
          setAccounts(data);
        }
      })
      .catch((err) => console.error('Error fetching accounts:', err))
      .finally(() => setLoadingAccounts(false));

    // 3. Fetch Campaigns
    fetch(`${API_BASE}/campaigns/`, { headers })
      .then(async (res) => {
        if (res.ok) {
          const data: CampaignOut[] = await res.json();
          setCampaigns(data);
        }
      })
      .catch((err) => console.error('Error fetching campaigns:', err))
      .finally(() => setLoadingCampaigns(false));

    // 4. Fetch Overview Analytics
    fetch(`${API_BASE}/analytics/overview`, { headers })
      .then(async (res) => {
        if (res.ok) {
          const data: OverviewAnalytics = await res.json();
          setAnalytics(data);
        }
      })
      .catch((err) => console.error('Error fetching analytics overview:', err))
      .finally(() => setLoadingAnalytics(false));
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchDashboardData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token]);

  const handleOpenLogs = async (post: PostOut) => {
    setActiveLogPost(post);
    setLogsError(null);
    setLoadingLogs(true);
    setPostLogs([]);

    if (!token) {
      setLogsError('Authentication token missing');
      setLoadingLogs(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/posts/${post.id}/logs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data: PublishLogOut[] = await response.json();
        setPostLogs(data);
      } else {
        const errData = await response.json().catch(() => ({}));
        setLogsError(errData.detail || 'Failed to fetch publishing logs');
      }
    } catch (err: any) {
      console.error('Failed to load post logs:', err);
      setLogsError(err.message || 'Error fetching publishing history');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const confirmed = window.confirm(
      'Are you sure you want to delete this post? This action cannot be undone.'
    );
    if (!confirmed) return;

    if (!token) {
      setErrorMessage('You must be authenticated to delete a post.');
      return;
    }

    setDeletingId(postId);

    try {
      const response = await fetch(`${API_BASE}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.detail || 'Failed to delete post.');
        return;
      }

      setSuccessMessage('Post deleted successfully.');
      fetchDashboardData();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      setErrorMessage(err.message || 'An error occurred while deleting the post.');
    } finally {
      setDeletingId(null);
    }
  };

  // Summary counts
  const scheduledCount = posts.filter((p) => p.status.toLowerCase() === 'scheduled').length;
  const publishedCount = posts.filter((p) => p.status.toLowerCase() === 'published').length;
  const connectedAccountsCount = accounts.length;
  const totalEngagements = analytics?.totals
    ? analytics.totals.likes +
      analytics.totals.comments +
      analytics.totals.shares +
      analytics.totals.views +
      analytics.totals.reach
    : 0;

  const statCards = [
    {
      icon: Clock,
      label: 'Scheduled Posts',
      value: scheduledCount,
      variant: 'brand' as const,
      color: 'text-brand-600 bg-brand-50',
    },
    {
      icon: CheckCircle2,
      label: 'Published Posts',
      value: publishedCount,
      variant: 'success' as const,
      color: 'text-success-600 bg-success-50',
    },
    {
      icon: Link2,
      label: 'Connected Channels',
      value: connectedAccountsCount,
      variant: connectedAccountsCount > 0 ? ('brand' as const) : ('neutral' as const),
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      icon: TrendingUp,
      label: 'Total Engagements',
      value: totalEngagements.toLocaleString(),
      variant: 'accent' as const,
      color: 'text-amber-600 bg-amber-50',
    },
  ];

  // Up to 5 most relevant upcoming/recent posts
  const recentPosts = posts.slice(0, 5);
  // Active / recent campaigns
  const recentCampaigns = campaigns.slice(0, 3);

  const isGlobalLoading = loadingPosts && loadingAccounts;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Dashboard"
        description="An overview of your social media activity, campaigns, and cross-platform performance."
        action={
          <Button to="/app/create" variant="secondary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
            Create Post
          </Button>
        }
      />

      {/* Error & Success alerts */}
      {errorMessage && (
        <div className="flex items-center justify-between rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-semibold text-danger-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-success-600" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-xs font-semibold text-success-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Welcome banner */}
      <Card className="relative overflow-hidden border-ink-100 bg-gradient-to-br from-ink-950 via-ink-900 to-brand-900 p-6 sm:p-8">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-10 right-20 h-32 w-32 rounded-full bg-accent-500/15 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70">
              <Sparkles className="h-3 w-3 text-brand-300" />
              Welcome to SocialPilot
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white sm:text-2xl">
              Let's get your social presence organized.
            </h2>
            <p className="mt-1.5 max-w-lg text-sm text-white/60">
              {accounts.length > 0
                ? `You have ${accounts.length} social account${accounts.length === 1 ? '' : 's'} linked and ready for multi-channel publishing.`
                : 'Connect your social accounts to start composing, scheduling, and tracking performance across all platforms.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              to="/app/accounts"
              variant="secondary"
              size="md"
              leftIcon={<Link2 className="h-4 w-4" />}
            >
              {accounts.length > 0 ? 'Manage Channels' : 'Connect Account'}
            </Button>
            <Button
              to="/app/create"
              variant="primary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Post
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <Badge variant={s.variant}>{s.label.split(' ')[0]}</Badge>
            </div>
            <p className="mt-3 text-sm text-ink-500">{s.label}</p>
            {isGlobalLoading ? (
              <Skeleton className="mt-1.5 h-7 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-bold text-ink-900">{s.value}</p>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — scheduling & campaigns & analytics */}
        <div className="space-y-6 lg:col-span-2">
          {/* Scheduling / Recent Posts Overview */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-100 p-5">
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-5 w-5 text-ink-700" />
                <h3 className="text-base font-semibold text-ink-900">Upcoming & Recent Posts</h3>
                {posts.length > 0 && (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700">
                    {posts.length}
                  </span>
                )}
              </div>
              <Link to="/app/calendar" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all in Calendar
              </Link>
            </div>

            {loadingPosts ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
                  <p className="text-sm text-ink-400">Loading your posts...</p>
                </div>
              </div>
            ) : recentPosts.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<CalendarDays className="h-7 w-7" />}
                  title="No posts yet"
                  description="Create your first post and schedule it or save it as a draft."
                  action={
                    <Button to="/app/create" size="sm" variant="secondary" leftIcon={<Plus className="h-4 w-4" />}>
                      Create your first post
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {recentPosts.map((post) => {
                  const statusLower = post.status.toLowerCase();
                  const isEditable = statusLower === 'draft' || statusLower === 'scheduled';
                  const isPublished = statusLower === 'published';

                  return (
                    <div key={post.id} className="p-5 transition-colors hover:bg-ink-50/40">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        {/* Left: Info */}
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={getPostStatusBadgeVariant(post.status)} dot>
                              <span className="capitalize">{post.status.replace('_', ' ')}</span>
                            </Badge>

                            {post.is_recurring && (
                              <Badge variant="accent" size="sm">
                                <Repeat className="h-3 w-3 mr-1" />
                                Repeats {post.recurrence_pattern || 'custom'}
                              </Badge>
                            )}

                            <span className="flex items-center gap-1 text-xs font-medium text-ink-500">
                              {statusLower === 'publishing' ||
                              (statusLower === 'scheduled' && !post.scheduled_time) ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
                              ) : (
                                <Clock className="h-3.5 w-3.5 text-ink-400" />
                              )}
                              {getPostTimingLabel(post)}
                            </span>
                          </div>

                          {/* Title & Content snippet */}
                          <div>
                            {post.title && (
                              <h4 className="text-sm font-bold text-ink-900 flex items-center gap-1.5 mb-0.5">
                                <Video className="h-3.5 w-3.5 text-red-600" />
                                {post.title}
                              </h4>
                            )}
                            <p className="text-sm text-ink-700 whitespace-pre-wrap line-clamp-2">
                              {post.content}
                            </p>
                          </div>

                          {/* Targeted Platforms */}
                          <div className="pt-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {post.platform_posts.length === 0 ? (
                                <span className="text-xs italic text-ink-400">
                                  No accounts selected (Draft)
                                </span>
                              ) : (
                                post.platform_posts.map((pp) => {
                                  const pKey = backendPlatformToKey(pp.platform);
                                  const p = platforms.find((x) => x.key === pKey);

                                  return (
                                    <div
                                      key={pp.id}
                                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 py-0.5 text-xs shadow-xs"
                                    >
                                      <div
                                        className={`flex h-4 w-4 items-center justify-center rounded ${
                                          p?.bg || 'bg-ink-50'
                                        } ${p?.color || 'text-ink-600'}`}
                                      >
                                        <PlatformIcon platform={pKey} className="h-3 w-3" />
                                      </div>
                                      <span className="font-semibold text-ink-800 capitalize">
                                        {pp.platform}:
                                      </span>
                                      <Badge variant={getPlatformStatusBadgeVariant(pp.status)} size="sm">
                                        <span className="capitalize">{pp.status}</span>
                                      </Badge>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex flex-wrap items-center gap-2 sm:self-start">
                          {/* Publishing History Logs */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenLogs(post)}
                            title="View publishing history and logs"
                            leftIcon={<History className="h-3.5 w-3.5 text-ink-600" />}
                          >
                            Logs
                          </Button>

                          {/* Edit Action */}
                          {isEditable ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate('/app/create', { state: { editPost: post } })}
                              leftIcon={<PenSquare className="h-3.5 w-3.5" />}
                            >
                              Edit
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              title={`Cannot edit post with status "${post.status}". Only draft or scheduled posts can be edited.`}
                              className="opacity-40 cursor-not-allowed"
                              leftIcon={<PenSquare className="h-3.5 w-3.5 text-ink-300" />}
                            >
                              Edit
                            </Button>
                          )}

                          {/* Delete Action */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingId === post.id || isPublished}
                            title={
                              isPublished
                                ? 'Cannot delete published posts'
                                : 'Delete post'
                            }
                            leftIcon={
                              deletingId === post.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5 text-danger-600" />
                              )
                            }
                            className={`text-danger-600 border-danger-100 hover:bg-danger-50 hover:border-danger-200 ${
                              isPublished ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                          >
                            {deletingId === post.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Campaign overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <FolderKanban className="h-5 w-5 text-ink-700" />
                <h3 className="text-base font-semibold text-ink-900">Campaign Overview</h3>
                {campaigns.length > 0 && (
                  <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-700">
                    {campaigns.length}
                  </span>
                )}
              </div>
              <Link to="/app/campaigns" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View all in Campaigns
              </Link>
            </div>

            {loadingCampaigns ? (
              <div className="space-y-3 py-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentCampaigns.length === 0 ? (
              <EmptyState
                icon={<FolderKanban className="h-7 w-7" />}
                title="No active campaigns"
                description="Create a campaign to organize multi-platform content and track aggregated performance."
                action={<Button to="/app/campaigns" size="sm" variant="secondary">Create a campaign</Button>}
              />
            ) : (
              <div className="space-y-3">
                {recentCampaigns.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-ink-100 bg-white p-4 shadow-xs transition-colors hover:border-ink-200"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-ink-900">{c.name}</h4>
                        <Badge
                          variant={
                            c.status === 'active'
                              ? 'success'
                              : c.status === 'completed'
                              ? 'brand'
                              : c.status === 'paused'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          <span className="capitalize">{c.status}</span>
                        </Badge>
                      </div>
                      {c.description && (
                        <p className="text-xs text-ink-500 line-clamp-1">{c.description}</p>
                      )}
                      {c.goal && (
                        <p className="text-[11px] text-brand-600 font-medium">Goal: {c.goal}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Link
                        to="/app/analytics"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Analytics
                      </Link>
                      <Link
                        to="/app/campaigns"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-700 hover:text-ink-900 bg-ink-50 px-2.5 py-1.5 rounded-lg transition-colors"
                      >
                        Manage
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Performance analytics summary */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-ink-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-5 w-5 text-brand-600" />
                <h3 className="text-base font-semibold text-ink-900">Performance Analytics</h3>
              </div>
              <Link to="/app/analytics" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                View full analytics &rarr;
              </Link>
            </div>

            {loadingAnalytics ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 py-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !analytics || (analytics.totals.likes === 0 && analytics.totals.comments === 0 && analytics.totals.views === 0 && analytics.totals.reach === 0 && analytics.published_posts === 0) ? (
              <EmptyState
                icon={<BarChart3 className="h-7 w-7 text-brand-500" />}
                title={accounts.length === 0 ? "Connect social channels to view analytics" : "No live analytics activity yet"}
                description={
                  accounts.length === 0
                    ? "Connect your social accounts to start monitoring live performance and engagement."
                    : "Publish posts across your connected channels to view real-time reach, likes, views, and comments."
                }
                action={
                  accounts.length === 0 ? (
                    <Button to="/app/accounts" size="sm" variant="secondary" leftIcon={<Link2 className="h-3.5 w-3.5" />}>
                      Connect Channels
                    </Button>
                  ) : (
                    <Button to="/app/create" size="sm" variant="secondary" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                      Publish a Post
                    </Button>
                  )
                }
              />
            ) : (
              <div className="space-y-4">
                {/* Metric cards grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3.5">
                    <div className="flex items-center gap-2 text-rose-600">
                      <Heart className="h-4 w-4" />
                      <span className="text-xs font-semibold">Likes</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-ink-900">
                      {analytics.totals.likes.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
                    <div className="flex items-center gap-2 text-blue-600">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-xs font-semibold">Comments</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-ink-900">
                      {analytics.totals.comments.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-3.5">
                    <div className="flex items-center gap-2 text-purple-600">
                      <Eye className="h-4 w-4" />
                      <span className="text-xs font-semibold">Views</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-ink-900">
                      {analytics.totals.views.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-3.5">
                    <div className="flex items-center gap-2 text-amber-600">
                      <Share2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">Shares</span>
                    </div>
                    <p className="mt-2 text-xl font-bold text-ink-900">
                      {analytics.totals.shares.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Platform Summary Pills */}
                {analytics.platform_summary && analytics.platform_summary.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-ink-100">
                    <span className="text-xs font-medium text-ink-400">Platform Breakdown:</span>
                    {analytics.platform_summary.map((ps) => {
                      const pKey = backendPlatformToKey(ps.platform);
                      const p = platforms.find((x) => x.key === pKey);
                      const engCount = ps.likes + ps.comments + ps.shares + ps.views;

                      return (
                        <div
                          key={ps.platform}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 bg-ink-50 px-2.5 py-1 text-xs"
                        >
                          <PlatformIcon platform={pKey} className="h-3 w-3" />
                          <span className="font-semibold text-ink-800">{ps.platform}:</span>
                          <span className="font-bold text-brand-600">{engCount.toLocaleString()} eng</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right column — quick actions & connected accounts */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Card className="p-6">
            <h3 className="text-base font-semibold text-ink-900">Quick Actions</h3>
            <div className="mt-4 space-y-2">
              {quickActions.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="group flex items-center gap-3 rounded-xl border border-ink-100 p-3 transition-all hover:border-ink-200 hover:bg-ink-50/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 text-white transition-transform group-hover:scale-110">
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink-900">{a.label}</p>
                    <p className="text-xs text-ink-400">{a.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500" />
                </Link>
              ))}
            </div>
          </Card>

          {/* Connected accounts */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-ink-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-ink-700" />
                <h3 className="text-base font-semibold text-ink-900">Connected Accounts</h3>
              </div>
              <Link to="/app/accounts" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Manage
              </Link>
            </div>

            {loadingAccounts ? (
              <div className="space-y-3 py-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : accounts.length === 0 ? (
              <EmptyState
                compact
                icon={<Link2 className="h-6 w-6" />}
                title="No accounts connected"
                action={<Button to="/app/accounts" size="sm" variant="outline">Connect account</Button>}
              />
            ) : (
              <div className="space-y-2.5">
                {accounts.map((acc) => {
                  const pKey = backendPlatformToKey(acc.platform);
                  const p = platforms.find((x) => x.key === pKey);

                  return (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between rounded-xl border border-ink-100 bg-white p-3 shadow-xs transition-colors hover:border-ink-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            p?.bg || 'bg-ink-50'
                          } ${p?.color || 'text-ink-600'}`}
                        >
                          <PlatformIcon platform={pKey} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-ink-900 capitalize truncate">
                            {acc.platform}
                          </p>
                          <p className="text-[11px] text-ink-500 truncate" title={acc.account_name}>
                            {acc.account_name || 'Connected'}
                          </p>
                        </div>
                      </div>
                      <Badge variant="success" size="sm" dot>
                        Connected
                      </Badge>
                    </div>
                  );
                })}

                <div className="pt-2">
                  <Button
                    to="/app/accounts"
                    variant="outline"
                    size="sm"
                    fullWidth
                    leftIcon={<Plus className="h-3.5 w-3.5" />}
                  >
                    Connect Another Account
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Publishing History Logs Modal */}
      {activeLogPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl border border-ink-100 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-ink-100 p-5 bg-ink-50/50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink-900">Publishing History & Logs</h3>
                  <p className="text-xs text-ink-400">
                    Post #{activeLogPost.id} &bull; Status:{' '}
                    <span className="font-semibold capitalize">{activeLogPost.status}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogPost(null)}
                className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Post Content Snippet */}
              <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-3.5 text-xs text-ink-700 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-900">Post Content</span>
                  {activeLogPost.is_recurring && (
                    <Badge variant="accent" size="sm">
                      <Repeat className="h-3 w-3 mr-1" />
                      Repeats {activeLogPost.recurrence_pattern}
                    </Badge>
                  )}
                </div>
                {activeLogPost.title && (
                  <p className="font-semibold text-ink-900">Title: {activeLogPost.title}</p>
                )}
                <p className="line-clamp-2 text-ink-600 italic">"{activeLogPost.content}"</p>
              </div>

              {logsError && (
                <div className="flex items-center gap-2 rounded-xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-danger-600" />
                  <span>{logsError}</span>
                </div>
              )}

              {loadingLogs ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-ink-400">
                  <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                  <span className="text-xs">Fetching publishing logs...</span>
                </div>
              ) : postLogs.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <FileText className="mx-auto h-8 w-8 text-ink-300" />
                  <p className="text-sm font-medium text-ink-700">No publish attempts recorded yet</p>
                  <p className="text-xs text-ink-400 max-w-sm mx-auto">
                    Publish logs will appear here when this post triggers publishing to social platforms.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Chronological Audit Trail ({postLogs.length} entries)
                  </h4>
                  <div className="space-y-2.5">
                    {postLogs.map((log) => {
                      const pKey = backendPlatformToKey(log.platform);
                      const p = platforms.find((x) => x.key === pKey);
                      const isSuccess = log.event.toLowerCase() === 'success';
                      const isFailure = log.event.toLowerCase() === 'failure';

                      return (
                        <div
                          key={log.id}
                          className="flex flex-col sm:flex-row sm:items-start gap-3 rounded-xl border border-ink-100 bg-white p-3.5 shadow-xs transition-colors hover:border-ink-200"
                        >
                          <div className="flex items-center gap-2.5 shrink-0">
                            <div
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                p?.bg || 'bg-ink-50'
                              } ${p?.color || 'text-ink-600'}`}
                            >
                              <PlatformIcon platform={pKey} className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold capitalize text-ink-900">
                                {log.platform}
                              </p>
                              <p className="text-[11px] text-ink-400">
                                {formatDateTime(log.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 space-y-1 sm:pl-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  isSuccess ? 'success' : isFailure ? 'danger' : 'warning'
                                }
                                size="sm"
                              >
                                <span className="capitalize">{log.event}</span>
                              </Badge>
                            </div>
                            {log.message ? (
                              <p
                                className={`text-xs ${
                                  isFailure ? 'text-danger-700 font-mono bg-danger-50/50 p-2 rounded-lg' : 'text-ink-700'
                                } whitespace-pre-wrap break-words`}
                              >
                                {log.message}
                              </p>
                            ) : (
                              <p className="text-xs text-ink-400 italic">No additional message logged.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t border-ink-100 p-4 bg-ink-50/30">
              <Button variant="outline" size="sm" onClick={() => setActiveLogPost(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
