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
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import { Skeleton } from '@/components/common/Skeleton';
import { PlatformIcon, type PlatformKey } from '@/components/common/PlatformIcons';
import { getCampaigns } from '@/services/campaigns';
import { getCampaignAnalytics } from '@/services/analytics';
import type { CampaignOut } from '@/types/campaign';
import type { CampaignAnalytics, PostAnalytics, PlatformStats } from '@/types/analytics';

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
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<PostAnalytics | null>(null);

  // 1. Fetch campaigns on mount
  useEffect(() => {
    const fetchCampaignList = async () => {
      setLoadingCampaigns(true);
      try {
        const data = await getCampaigns();
        setCampaigns(data);
        if (data.length > 0) {
          setSelectedCampaignId(data[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load campaigns:', err);
        setError(err.message || 'Failed to load campaigns');
      } finally {
        setLoadingCampaigns(false);
      }
    };

    fetchCampaignList();
  }, []);

  // 2. Fetch analytics when selected campaign changes
  const fetchAnalyticsData = async (campaignId: number) => {
    setLoadingAnalytics(true);
    setError(null);
    try {
      const data = await getCampaignAnalytics(campaignId);
      setAnalytics(data);
    } catch (err: any) {
      console.error('Failed to load campaign analytics:', err);
      setError(err.message || 'Failed to load campaign analytics');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (selectedCampaignId !== null) {
      fetchAnalyticsData(selectedCampaignId);
    }
  }, [selectedCampaignId]);

  const handleExportCampaignCsv = () => {
    if (!selectedCampaignId) return;
    const token = localStorage.getItem('token');
    const url = `${API_BASE}/reports/campaigns/${selectedCampaignId}/export?format=csv`;
    
    // Create a temporary link to download
    const link = document.createElement('a');
    link.href = url;
    // Set headers or trigger via fetch blob to include authorization header
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
        a.download = `campaign_${selectedCampaignId}_report.csv`;
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
    const token = localStorage.getItem('token');
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

  if (loadingCampaigns) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
        <PageHeader title="Analytics" description="Loading campaign metrics..." />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
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

  if (campaigns.length === 0) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
        <PageHeader title="Analytics" description="Track and analyze campaign performance across platforms." />
        <Card className="border-dashed p-12">
          <EmptyState
            icon={<BarChart3 className="h-8 w-8 text-brand-500" />}
            title="No campaigns available"
            description="Create your first campaign and schedule posts to view unified cross-platform analytics."
            action={
              <Button to="/app/campaigns" variant="secondary" size="md">
                Create a Campaign
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const totals = analytics?.totals || {
    likes: 0,
    comments: 0,
    views: 0,
    reach: 0,
    shares: 0,
    saved: 0,
  };

  const metricCards = [
    { label: 'Likes', value: totals.likes, icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Comments', value: totals.comments, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Views', value: totals.views, icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Reach', value: totals.reach, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Shares', value: totals.shares, icon: Share2, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Saved', value: totals.saved, icon: Bookmark, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  ];

  // Prepare chart data: aggregate metrics per platform
  const platformSummary: Record<string, { platform: string; likes: number; comments: number; shares: number; views: number }> = {};
  analytics?.posts.forEach((p) => {
    p.platforms.forEach((plat) => {
      const name = plat.platform;
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

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      {/* Header and Controls */}
      <PageHeader
        title="Analytics"
        description="Unified cross-platform metrics, live stats, and campaign breakdowns."
        action={
          <div className="flex flex-wrap items-center gap-3">
            {/* Campaign Selector */}
            <div className="flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-ink-400" />
              <select
                value={selectedCampaignId || ''}
                onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
                className="rounded-xl border border-ink-200 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-ink-800 shadow-soft focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectedCampaignId && fetchAnalyticsData(selectedCampaignId)}
              disabled={loadingAnalytics}
              leftIcon={<RefreshCw className={`h-3.5 w-3.5 ${loadingAnalytics ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>

            {/* Export CSV Button */}
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCampaignCsv}
              disabled={loadingAnalytics || !analytics}
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
              {loadingAnalytics ? <Skeleton className="h-7 w-12" /> : m.value.toLocaleString()}
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
          <span className="text-xs text-ink-400">Total engagements per platform</span>
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
          <div className="flex h-48 items-center justify-center text-sm text-ink-400">
            No published platform activity to display yet.
          </div>
        )}
      </Card>

      {/* Posts Breakdown Section */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 p-5">
          <div>
            <h3 className="text-base font-bold text-ink-900">Campaign Posts Breakdown</h3>
            <p className="text-xs text-ink-400">
              {analytics?.posts.length || 0} post{(analytics?.posts.length || 0) === 1 ? '' : 's'} in this campaign
            </p>
          </div>
        </div>

        {(!analytics?.posts || analytics.posts.length === 0) ? (
          <div className="p-8">
            <EmptyState
              compact
              icon={<FileText className="h-6 w-6" />}
              title="No posts in this campaign"
              description="Assign posts to this campaign when creating or editing posts to see their breakdown here."
              action={
                <Button to="/app/create" variant="outline" size="sm">
                  Create Post
                </Button>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {analytics.posts.map((post) => (
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
                    {post.platforms.map((plat, idx) => {
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
                          <span>{plat.platform}</span>
                          {isAvailable ? (
                            <span className="text-emerald-700 font-bold">
                              {(plat.likes || 0) + (plat.comments || 0)} eng
                            </span>
                          ) : (
                            <span className="text-xs opacity-75">
                              {plat.status === 'published' ? 'no stats' : plat.status}
                            </span>
                          )}
                        </div>
                      );
                    })}
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
              {selectedPost.platforms.map((plat, idx) => {
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
                          <p className="text-sm font-bold text-ink-900">{plat.platform}</p>
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
                        <p>{plat.reason || 'Statistics not available for this post.'}</p>
                      </div>
                    )}
                  </div>
                );
              })}
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
