import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  Heart,
  MessageSquare,
  Eye,
  TrendingUp,
  Share2,
  Bookmark,
  BarChart3,
  FolderKanban,
  RefreshCw,
  X,
  AlertCircle,
  FileText,
  ChevronRight,
  Download,
  Info,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { PlatformIcon, type PlatformKey } from '@/components/common/PlatformIcons';
import { getCampaigns } from '@/services/campaigns';
import { getCampaignAnalytics, getOverviewAnalytics } from '@/services/analytics';
import type { CampaignOut } from '@/types/campaign';
import type { CampaignAnalytics, PostAnalytics, OverviewAnalytics, CampaignTotals } from '@/types/analytics';

const API_BASE = 'http://localhost:8000';

function normalizePlatform(p: string): PlatformKey {
  const norm = (p || '').toLowerCase();
  if (norm.includes('linkedin')) return 'linkedin';
  if (norm.includes('youtube')) return 'youtube';
  if (norm.includes('instagram')) return 'instagram';
  if (norm.includes('facebook')) return 'facebook';
  if (norm === 'x' || norm.includes('twitter')) return 'x';
  return 'x';
}

export default function Analytics() {
  const [campaigns, setCampaigns] = useState<CampaignOut[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all'); // 'all', 'standalone', or campaign ID
  const [overviewData, setOverviewData] = useState<OverviewAnalytics | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostAnalytics | null>(null);

  const token = localStorage.getItem('token');

  // 1. Initial load
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      // Fetch both campaigns and overview in parallel
      const [cList, ovData] = await Promise.all([
        getCampaigns().catch(() => [] as CampaignOut[]),
        getOverviewAnalytics().catch((err) => {
          console.error('Overview analytics error:', err);
          return null;
        }),
      ]);

      setCampaigns(cList);
      setOverviewData(ovData);

      // If specific campaign was selected, re-fetch that campaign's analytics
      if (selectedFilter !== 'all' && selectedFilter !== 'standalone') {
        const cId = Number(selectedFilter);
        if (!isNaN(cId)) {
          const cData = await getCampaignAnalytics(cId);
          setCampaignData(cData);
        }
      }
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle filter change
  const handleFilterChange = async (newFilter: string) => {
    setSelectedFilter(newFilter);
    setError(null);

    if (newFilter === 'all' || newFilter === 'standalone') {
      setCampaignData(null);
      return;
    }

    // Specific campaign selected
    const cId = Number(newFilter);
    if (!isNaN(cId)) {
      setRefreshing(true);
      try {
        const cData = await getCampaignAnalytics(cId);
        setCampaignData(cData);
      } catch (err: any) {
        console.error('Failed to load campaign analytics:', err);
        setError(err.message || 'Failed to load campaign analytics');
      } finally {
        setRefreshing(false);
      }
    }
  };

  // CSV Exports
  const handleExportCsv = () => {
    const isCampaign = selectedFilter !== 'all' && selectedFilter !== 'standalone';
    const url = isCampaign
      ? `${API_BASE}/reports/campaigns/${selectedFilter}/export?format=csv`
      : `${API_BASE}/reports/overview/export?format=csv`;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = isCampaign
          ? `campaign_${selectedFilter}_report.csv`
          : `socialpilot_analytics_overview.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => {
        console.error('CSV export failed:', err);
        alert('Could not export CSV. Please try again.');
      });
  };

  const handleExportPostCsv = (postId: number) => {
    const url = `${API_BASE}/reports/posts/${postId}/export?format=csv`;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `post_${postId}_report.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => {
        console.error('CSV export failed:', err);
        alert('Could not export post CSV. Please try again.');
      });
  };

  // Calculate active data according to selected filter
  let displayTotals: CampaignTotals = {
    likes: 0,
    comments: 0,
    views: 0,
    reach: 0,
    shares: 0,
    saved: 0,
  };
  let displayPosts: PostAnalytics[] = [];
  let displayTitle = 'Overview (All Channels & Posts)';

  if (selectedFilter === 'all') {
    displayTotals = overviewData?.totals || displayTotals;
    displayPosts = overviewData?.posts || [];
    displayTitle = 'Overview (All Channels & Posts)';
  } else if (selectedFilter === 'standalone') {
    displayPosts = (overviewData?.posts || []).filter((p) => !p.campaign_id);
    const totals = { likes: 0, comments: 0, views: 0, reach: 0, shares: 0, saved: 0 };
    displayPosts.forEach((p) => {
      p.platforms.forEach((plat) => {
        if (plat.available) {
          totals.likes += plat.likes || 0;
          totals.comments += plat.comments || 0;
          totals.views += plat.views || 0;
          totals.reach += plat.reach || 0;
          totals.shares += plat.shares || 0;
          totals.saved += plat.saved || 0;
        }
      });
    });
    displayTotals = totals;
    displayTitle = 'Standalone Posts (No Campaign)';
  } else {
    // Specific campaign
    displayTotals = campaignData?.totals || displayTotals;
    displayPosts = campaignData?.posts || [];
    const c = campaigns.find((x) => x.id === Number(selectedFilter));
    displayTitle = c ? `Campaign: ${c.name}` : 'Campaign Analytics';
  }

  // Chart data calculation
  const platformSummary: Record<string, { platform: string; likes: number; comments: number; shares: number; views: number }> = {};
  displayPosts.forEach((p) => {
    p.platforms.forEach((plat) => {
      const name = plat.platform.charAt(0).toUpperCase() + plat.platform.slice(1).toLowerCase();
      if (!platformSummary[name]) {
        platformSummary[name] = { platform: name, likes: 0, comments: 0, shares: 0, views: 0 };
      }
      if (plat.available) {
        platformSummary[name].likes += plat.likes || 0;
        platformSummary[name].comments += plat.comments || 0;
        platformSummary[name].shares += plat.shares || 0;
        platformSummary[name].views += plat.views || 0;
      }
    });
  });
  const chartData = Object.values(platformSummary);
  const totalEngagements = displayTotals.likes + displayTotals.comments + displayTotals.shares + displayTotals.views + displayTotals.reach;

  const metricCards = [
    { label: 'Likes', value: displayTotals.likes, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Comments', value: displayTotals.comments, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Views', value: displayTotals.views, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Reach', value: displayTotals.reach, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Shares', value: displayTotals.shares, icon: Share2, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Saved', value: displayTotals.saved, icon: Bookmark, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
        <PageHeader title="Analytics" description="Loading metrics & live social activity..." />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="mt-3 h-7 w-12" />
            </Card>
          ))}
        </div>
        <Card className="p-6">
          <Skeleton className="h-64 w-full" />
        </Card>
      </div>
    );
  }

  const hasNoDataAtAll = !overviewData || overviewData.total_posts === 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      {/* Header and Controls */}
      <PageHeader
        title="Analytics"
        description="Unified cross-platform metrics, live stats, and campaign breakdowns."
        action={
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Selector */}
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-ink-400" />
              <select
                value={selectedFilter}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="rounded-xl border border-ink-200 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-ink-800 shadow-soft focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
              >
                <option value="all">Overview (All Posts & Campaigns)</option>
                {campaigns.length > 0 && (
                  <optgroup label="Campaigns">
                    {campaigns.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        Campaign: {c.name} ({c.status})
                      </option>
                    ))}
                  </optgroup>
                )}
                <option value="standalone">Standalone Posts (No Campaign)</option>
              </select>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={refreshing}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>

            {/* Export CSV Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCsv}
              disabled={refreshing || displayPosts.length === 0}
              leftIcon={<Download className="h-3.5 w-3.5" />}
            >
              Export CSV
            </Button>
          </div>
        }
      />

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Scope Banner */}
      <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-2.5 text-xs text-ink-600 border border-ink-100">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          <span>
            Showing data for: <strong className="text-ink-900 font-semibold">{displayTitle}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>{displayPosts.length} posts analyzed</span>
          <span>&bull;</span>
          <span>{totalEngagements.toLocaleString()} total interactions</span>
        </div>
      </div>

      {/* Totals Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {metricCards.map((m) => (
          <Card key={m.label} hover className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-ink-400">{m.label}</span>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.bg} ${m.color}`}>
                <m.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-ink-900">
              {refreshing ? <Skeleton className="h-7 w-12" /> : m.value.toLocaleString()}
            </p>
          </Card>
        ))}
      </div>

      {/* Performance Overview Chart */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between border-b border-ink-100 pb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-600" />
            <h3 className="text-base font-bold text-ink-900">Engagement by Platform</h3>
          </div>
          <span className="text-xs text-ink-400">Aggregated live platform metrics</span>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="platform" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderRadius: '0.75rem',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="likes" name="Likes" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comments" name="Comments" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="shares" name="Shares" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="views" name="Views" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-8 w-8 text-ink-300 mb-2" />
            <p className="text-sm font-semibold text-ink-700">No published platform metrics yet</p>
            <p className="text-xs text-ink-400 max-w-sm mt-1">
              Publish posts to your connected social channels (YouTube, Facebook, Instagram, LinkedIn) to see live engagement graphs.
            </p>
          </div>
        )}
      </Card>

      {/* Posts Breakdown Section */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 p-5">
          <div>
            <h3 className="text-base font-bold text-ink-900">Post-by-Post Breakdown</h3>
            <p className="text-xs text-ink-400">
              {displayPosts.length} post{displayPosts.length === 1 ? '' : 's'} in selected view
            </p>
          </div>
        </div>

        {displayPosts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              compact
              icon={<FileText className="h-6 w-6" />}
              title={hasNoDataAtAll ? 'No posts created yet' : 'No posts in this view'}
              description={
                hasNoDataAtAll
                  ? 'Create and publish posts across your channels to start viewing live analytics.'
                  : 'No posts match the current filter selection.'
              }
              action={
                <Button to="/app/create" variant="secondary" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  Create Post
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {displayPosts.map((post) => (
              <div
                key={post.post_id}
                className="flex flex-col gap-4 p-5 transition-colors hover:bg-ink-50/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1.5 max-w-md">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-600">Post #{post.post_id}</span>
                    <h4 className="text-sm font-semibold text-ink-900 truncate">
                      {post.title || 'Untitled Post'}
                    </h4>
                  </div>
                  {/* Platforms overview pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {post.platforms.length === 0 ? (
                      <span className="text-xs italic text-ink-400">No platforms assigned</span>
                    ) : (
                      post.platforms.map((plat, idx) => {
                        const platformKey = normalizePlatform(plat.platform);
                        const isAvailable = plat.available;
                        return (
                          <div
                            key={idx}
                            title={!isAvailable ? plat.reason : `${plat.platform}: ${plat.likes || 0} likes, ${plat.comments || 0} comments`}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border ${
                              isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : plat.status === 'published'
                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                : 'bg-ink-50 text-ink-600 border-ink-200'
                            }`}
                          >
                            <PlatformIcon platform={platformKey} className="h-3.5 w-3.5" />
                            <span className="capitalize">{plat.platform}</span>
                            {isAvailable ? (
                              <span className="text-emerald-700 font-bold">
                                {(plat.likes || 0) + (plat.comments || 0) + (plat.views || 0)} eng
                              </span>
                            ) : (
                              <span className="text-xs opacity-75">
                                {plat.status === 'published' ? 'no stats' : plat.status}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportPostCsv(post.post_id)}
                    leftIcon={<Download className="h-3.5 w-3.5" />}
                    title="Export post CSV"
                  >
                    CSV
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedPost(post)}
                    rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Drill-down Post Details Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl border border-ink-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-ink-100 pb-4 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="brand">Post #{selectedPost.post_id}</Badge>
                  <h3 className="text-lg font-bold text-ink-900">
                    {selectedPost.title || 'Untitled Post'}
                  </h3>
                </div>
                <p className="text-xs text-ink-400 mt-1">Platform-level performance & health</p>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedPost.platforms.length === 0 ? (
                <p className="text-sm text-ink-400 italic py-4 text-center">No platform targets found for this post.</p>
              ) : (
                selectedPost.platforms.map((plat, idx) => {
                  const platformKey = normalizePlatform(plat.platform);
                  return (
                    <div
                      key={idx}
                      className="rounded-xl border border-ink-100 bg-ink-50/50 p-4 transition-all hover:bg-ink-50"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-soft">
                            <PlatformIcon platform={platformKey} className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-ink-900 capitalize">{plat.platform}</p>
                            <p className="text-xs text-ink-400 capitalize">Status: {plat.status}</p>
                          </div>
                        </div>

                        <Badge variant={plat.available ? 'success' : plat.status === 'published' ? 'warning' : 'neutral'}>
                          {plat.available ? 'Live Stats' : plat.status === 'published' ? 'Stats Unavailable' : plat.status}
                        </Badge>
                      </div>

                      {plat.available ? (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 pt-2 border-t border-ink-100">
                          {plat.likes !== undefined && (
                            <div className="rounded-lg bg-white p-2.5 shadow-soft border border-ink-100">
                              <span className="text-xs text-ink-400">Likes</span>
                              <p className="text-base font-bold text-ink-900">{plat.likes.toLocaleString()}</p>
                            </div>
                          )}
                          {plat.comments !== undefined && (
                            <div className="rounded-lg bg-white p-2.5 shadow-soft border border-ink-100">
                              <span className="text-xs text-ink-400">Comments</span>
                              <p className="text-base font-bold text-ink-900">{plat.comments.toLocaleString()}</p>
                            </div>
                          )}
                          {plat.views !== undefined && (
                            <div className="rounded-lg bg-white p-2.5 shadow-soft border border-ink-100">
                              <span className="text-xs text-ink-400">Views</span>
                              <p className="text-base font-bold text-ink-900">{plat.views.toLocaleString()}</p>
                            </div>
                          )}
                          {plat.reach !== undefined && (
                            <div className="rounded-lg bg-white p-2.5 shadow-soft border border-ink-100">
                              <span className="text-xs text-ink-400">Reach</span>
                              <p className="text-base font-bold text-ink-900">{plat.reach.toLocaleString()}</p>
                            </div>
                          )}
                          {plat.shares !== undefined && (
                            <div className="rounded-lg bg-white p-2.5 shadow-soft border border-ink-100">
                              <span className="text-xs text-ink-400">Shares</span>
                              <p className="text-base font-bold text-ink-900">{plat.shares.toLocaleString()}</p>
                            </div>
                          )}
                          {plat.saved !== undefined && (
                            <div className="rounded-lg bg-white p-2.5 shadow-soft border border-ink-100">
                              <span className="text-xs text-ink-400">Saved</span>
                              <p className="text-base font-bold text-ink-900">{plat.saved.toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-lg bg-amber-50/70 p-3 text-xs text-amber-800 border border-amber-200">
                          <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                          <p>{plat.reason || 'Live statistics not available for this platform item.'}</p>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-6 flex justify-between gap-3 border-t border-ink-100 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPostCsv(selectedPost.post_id)}
                leftIcon={<Download className="h-3.5 w-3.5" />}
              >
                Export Post CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedPost(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
