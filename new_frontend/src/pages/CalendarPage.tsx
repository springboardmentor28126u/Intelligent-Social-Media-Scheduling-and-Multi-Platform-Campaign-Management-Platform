import { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  CalendarDays,
  Trash2,
  AlertCircle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Video,
  FileText,
  Layers,
  LayoutList,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import { platforms, PlatformIcon, type PlatformKey } from '@/components/common/PlatformIcons';

const API_BASE = 'http://localhost:8000';

interface PostPlatformOut {
  id: number;
  social_account_id: number;
  platform: string;
  status: string;
  published_at?: string | null;
  external_post_id?: string | null;
  error_message?: string | null;
}

interface PostOut {
  id: number;
  title?: string | null;
  content: string;
  media_urls?: string[] | null;
  scheduled_time?: string | null;
  status: string;
  created_at: string;
  platform_posts: PostPlatformOut[];
}

function backendPlatformToKey(backendPlatform: string): PlatformKey {
  const normalized = backendPlatform.toLowerCase();
  if (normalized.includes('linkedin')) return 'linkedin';
  if (normalized.includes('youtube')) return 'youtube';
  if (normalized.includes('instagram')) return 'instagram';
  if (normalized.includes('facebook')) return 'facebook';
  if (normalized === 'x' || normalized.includes('twitter')) return 'x';
  return normalized as PlatformKey;
}

function getPostStatusBadgeVariant(status: string): 'brand' | 'neutral' | 'success' | 'warning' | 'danger' {
  switch (status.toLowerCase()) {
    case 'published':
      return 'success';
    case 'scheduled':
      return 'brand';
    case 'draft':
      return 'neutral';
    case 'publishing':
      return 'warning';
    case 'failed':
      return 'danger';
    case 'partially_published':
      return 'warning';
    default:
      return 'neutral';
  }
}

function getPlatformStatusBadgeVariant(status: string): 'brand' | 'neutral' | 'success' | 'warning' | 'danger' {
  switch (status.toLowerCase()) {
    case 'published':
      return 'success';
    case 'pending':
      return 'neutral';
    case 'publishing':
      return 'warning';
    case 'failed':
      return 'danger';
    default:
      return 'neutral';
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
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

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarPage() {
  const token = localStorage.getItem('token');
  const location = useLocation();
  const pollCountRef = useRef(0);
  const maxPolls = 10; // 10 * 3s = 30s max polling duration

  const [posts, setPosts] = useState<PostOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list');
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const hasInFlightPosts = (postList: PostOut[]) => {
    return postList.some((p) => {
      const status = p.status.toLowerCase();
      if (status === 'publishing') return true;
      if (status === 'scheduled' && !p.scheduled_time) return true;
      return p.platform_posts.some(
        (pp) => pp.status.toLowerCase() === 'publishing' || pp.status.toLowerCase() === 'pending'
      );
    });
  };

  const fetchPosts = async (isRefresh = false) => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch(`${API_BASE}/posts/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data: PostOut[] = await response.json();
        setPosts(data);
      } else {
        const errData = await response.json().catch(() => ({}));
        setErrorMessage(errData.detail || 'Failed to fetch posts');
      }
    } catch (err: any) {
      console.error('Error fetching posts:', err);
      setErrorMessage(err.message || 'Network error fetching posts');
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [token]);

  // Short-lived polling for immediate-publish status transitions
  useEffect(() => {
    const isJustCreated = location.state?.justCreated;
    const inFlight = hasInFlightPosts(posts);
    const shouldPoll = (isJustCreated && pollCountRef.current < maxPolls) || (inFlight && pollCountRef.current < maxPolls);

    if (!shouldPoll) {
      return;
    }

    const timer = setTimeout(async () => {
      pollCountRef.current += 1;
      await fetchPosts(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [posts, location.state, token]);

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchPosts(false);
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token]);

  const handleDeletePost = async (postId: number) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const confirmed = window.confirm('Are you sure you want to delete this post? This action cannot be undone.');
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
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.detail || 'Failed to delete post.');
        return;
      }

      setSuccessMessage('Post deleted successfully.');
      await fetchPosts();
    } catch (err: any) {
      console.error('Error deleting post:', err);
      setErrorMessage(err.message || 'An error occurred while deleting the post.');
    } finally {
      setDeletingId(null);
    }
  };

  // Filter posts
  const filteredPosts = posts.filter((p) => {
    if (statusFilter !== 'all' && p.status.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (platformFilter !== 'all') {
      const hasPlatform = p.platform_posts.some(
        (pp) => backendPlatformToKey(pp.platform) === platformFilter
      );
      if (!hasPlatform) return false;
    }
    return true;
  });

  const nextPeriod = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  const prevPeriod = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() - 1);
      return next;
    });
  };

  const currentMonthLabel = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Publishing Schedule & Posts"
        description="Visualize, manage, and track all your scheduled posts and publications across platforms."
        action={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="md"
              onClick={() => fetchPosts(true)}
              disabled={refreshing}
              leftIcon={<RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>
            <Button
              to="/app/create"
              variant="secondary"
              size="md"
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Create Post
            </Button>
          </div>
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

      {/* Main Container */}
      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center rounded-lg border border-ink-200 bg-ink-50 p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-ink-900 shadow-soft'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                List View ({filteredPosts.length})
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-ink-900 shadow-soft'
                    : 'text-ink-500 hover:text-ink-700'
                }`}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Calendar View
              </button>
            </div>

            {viewMode === 'calendar' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={prevPeriod}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-100"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-ink-900">{currentMonthLabel}</span>
                <button
                  onClick={nextPeriod}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-100"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-ink-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 focus:border-brand-300 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="failed">Failed</option>
                <option value="publishing">Publishing</option>
              </select>
            </div>

            {/* Platform filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-ink-500">Platform:</span>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs font-medium text-ink-700 focus:border-brand-300 focus:outline-none"
              >
                <option value="all">All Platforms</option>
                {platforms.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
              <p className="text-sm text-ink-400">Loading schedule and posts...</p>
            </div>
          </div>
        ) : filteredPosts.length === 0 && posts.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<CalendarDays className="h-8 w-8" />}
              title="No posts created yet"
              description="Create your first post and schedule it or save it as a draft."
              action={
                <Button to="/app/create" variant="secondary" size="md" leftIcon={<Plus className="h-4 w-4" />}>
                  Create your first post
                </Button>
              }
            />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-ink-500">No posts match the selected filters.</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setPlatformFilter('all');
              }}
              className="mt-2"
            >
              Reset Filters
            </Button>
          </div>
        ) : viewMode === 'list' ? (
          <div className="divide-y divide-ink-100">
            {filteredPosts.map((post) => (
              <div key={post.id} className="p-5 transition-colors hover:bg-ink-50/40">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: Info */}
                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Badge variant={getPostStatusBadgeVariant(post.status)} dot>
                        <span className="capitalize">{post.status.replace('_', ' ')}</span>
                      </Badge>

                      <span className="flex items-center gap-1 text-xs font-medium text-ink-500">
                        {post.status.toLowerCase() === 'publishing' || (post.status.toLowerCase() === 'scheduled' && !post.scheduled_time) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-ink-400" />
                        )}
                        {getPostTimingLabel(post)}
                      </span>
                    </div>

                    {/* Title & Content */}
                    <div>
                      {post.title && (
                        <h4 className="text-sm font-bold text-ink-900 flex items-center gap-1.5 mb-1">
                          <Video className="h-3.5 w-3.5 text-red-600" />
                          {post.title}
                        </h4>
                      )}
                      <p className="text-sm text-ink-700 whitespace-pre-wrap line-clamp-3">
                        {post.content}
                      </p>
                    </div>

                    {/* Platform breakdown */}
                    <div className="pt-1">
                      <p className="text-xs font-medium text-ink-400 mb-1.5">Targeted Platforms & Status:</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {post.platform_posts.map((pp) => {
                          const pKey = backendPlatformToKey(pp.platform);
                          const p = platforms.find((x) => x.key === pKey);

                          return (
                            <div
                              key={pp.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-xs shadow-xs"
                            >
                              <div
                                className={`flex h-4 w-4 items-center justify-center rounded ${
                                  p?.bg || 'bg-ink-50'
                                } ${p?.color || 'text-ink-600'}`}
                              >
                                <PlatformIcon platform={pKey} className="h-3 w-3" />
                              </div>
                              <span className="font-semibold text-ink-800 capitalize">{pp.platform}:</span>
                              <Badge variant={getPlatformStatusBadgeVariant(pp.status)} size="sm">
                                <span className="capitalize">{pp.status}</span>
                              </Badge>
                              {pp.error_message && (
                                <span className="text-[11px] text-danger-600 max-w-xs truncate" title={pp.error_message}>
                                  ({pp.error_message})
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 sm:self-start">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePost(post.id)}
                      disabled={deletingId === post.id}
                      leftIcon={
                        deletingId === post.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-danger-600" />
                        )
                      }
                      className="text-danger-600 border-danger-100 hover:bg-danger-50 hover:border-danger-200"
                    >
                      {deletingId === post.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Calendar Grid View */
          <MonthCalendarView
            currentDate={currentDate}
            posts={filteredPosts}
            onDeletePost={handleDeletePost}
            deletingId={deletingId}
          />
        )}
      </Card>
    </div>
  );
}

function MonthCalendarView({
  currentDate,
  posts,
  onDeletePost,
  deletingId,
}: {
  currentDate: Date;
  posts: PostOut[];
  onDeletePost: (id: number) => void;
  deletingId: number | null;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const totalCells = Math.ceil((firstDayIndex + daysInMonth) / 7) * 7;

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50/50">
        {dayNames.map((d) => (
          <div key={d} className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wider text-ink-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-y divide-ink-100">
        {Array.from({ length: totalCells }).map((_, i) => {
          const dayNumber = i - firstDayIndex + 1;
          const isCurrentMonthDay = dayNumber > 0 && dayNumber <= daysInMonth;

          // Find posts scheduled for this calendar date
          const cellDateStr = isCurrentMonthDay
            ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
            : null;

          const dayPosts = isCurrentMonthDay
            ? posts.filter((p) => {
                const dateToUse = p.scheduled_time || p.created_at;
                if (!dateToUse) return false;
                const pDate = new Date(dateToUse);
                const pDateStr = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}-${String(
                  pDate.getDate()
                ).padStart(2, '0')}`;
                return pDateStr === cellDateStr;
              })
            : [];

          return (
            <div
              key={i}
              className={`group min-h-[120px] p-2 transition-colors ${
                isCurrentMonthDay ? 'bg-white hover:bg-ink-50/30' : 'bg-ink-50/30 text-ink-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold ${
                    isCurrentMonthDay ? 'text-ink-700' : 'text-ink-300'
                  }`}
                >
                  {isCurrentMonthDay ? dayNumber : ''}
                </span>
                {dayPosts.length > 0 && (
                  <span className="text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded-full">
                    {dayPosts.length} post{dayPosts.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="mt-1.5 space-y-1.5">
                {dayPosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-lg border border-ink-200 bg-white p-2 text-xs shadow-xs hover:border-brand-300 hover:shadow-soft"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <Badge variant={getPostStatusBadgeVariant(post.status)} size="sm">
                        <span className="capitalize">{post.status.replace('_', ' ')}</span>
                      </Badge>
                      <button
                        type="button"
                        onClick={() => onDeletePost(post.id)}
                        disabled={deletingId === post.id}
                        className="text-ink-400 hover:text-danger-600"
                        title="Delete post"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="font-semibold text-ink-900 line-clamp-1">
                      {post.title || post.content}
                    </p>
                    <div className="mt-1 flex items-center gap-1">
                      {post.platform_posts.map((pp) => {
                        const pKey = backendPlatformToKey(pp.platform);
                        return (
                          <div key={pp.id} title={`${pp.platform}: ${pp.status}`}>
                            <PlatformIcon platform={pKey} className="h-3 w-3 text-ink-600" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
