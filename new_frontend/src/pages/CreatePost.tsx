import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  FileText,
  Plus,
  Eye,
  Video,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Link2,
  Send,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import { platforms, PlatformIcon, type PlatformKey } from '@/components/common/PlatformIcons';

const API_BASE = 'http://localhost:8000';

interface SocialAccountData {
  id: number;
  platform: string;
  account_name: string;
  status: string;
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

export default function CreatePost() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [accounts, setAccounts] = useState<SocialAccountData[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);

  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!token) {
        setLoadingAccounts(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE}/social-accounts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data: SocialAccountData[] = await response.json();
          setAccounts(data);
          // If accounts exist, default select the first one
          if (data.length > 0) {
            setSelectedAccountIds([data[0].id]);
          }
        }
      } catch (err) {
        console.error('Failed to load social accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [token]);

  const toggleAccount = (id: number) => {
    setSelectedAccountIds((prev) =>
      prev.includes(id) ? prev.filter((accId) => accId !== id) : [...prev, id]
    );
  };

  const selectedAccounts = accounts.filter((a) => selectedAccountIds.includes(a.id));
  const hasYouTube = selectedAccounts.some((a) =>
    a.platform.toLowerCase().includes('youtube')
  );

  const handleSubmit = async (publishImmediately: boolean = false) => {
    setError(null);

    if (!content.trim()) {
      setError('Post content is required.');
      return;
    }

    if (selectedAccountIds.length === 0) {
      setError('Please select at least one connected social account.');
      return;
    }

    if (!token) {
      setError('You must be logged in to create a post.');
      return;
    }

    let scheduled_time: string | null = null;
    if (!publishImmediately) {
      if (scheduledDate && scheduledTime) {
        try {
          const dateObj = new Date(`${scheduledDate}T${scheduledTime}`);
          if (isNaN(dateObj.getTime())) {
            setError('Invalid schedule date or time format.');
            return;
          }
          scheduled_time = dateObj.toISOString();
        } catch {
          setError('Failed to format scheduled date and time.');
          return;
        }
      } else if (scheduledDate || scheduledTime) {
        setError('Please provide both date and time to schedule, or clear both to publish immediately.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const payload = {
        title: hasYouTube && title.trim() ? title.trim() : null,
        content: content.trim(),
        media_urls: hasYouTube && videoUrl.trim() ? [videoUrl.trim()] : null,
        scheduled_time,
        social_account_ids: selectedAccountIds,
      };

      const response = await fetch(`${API_BASE}/posts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Failed to create post. Please try again.');
        return;
      }

      navigate('/app/calendar', { state: { justCreated: true } });
    } catch (err: any) {
      console.error('Error submitting post:', err);
      setError(err.message || 'An unexpected error occurred while creating the post.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title="Create Post"
        description="Compose your content, select platforms, and publish now or schedule for later."
      />

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Editor */}
        <div className="space-y-6">
          {/* Target Social Accounts */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-ink-900">Target Accounts</h3>
                <p className="mt-0.5 text-sm text-ink-400">Select which accounts to publish to.</p>
              </div>
              <Link to="/app/accounts">
                <Button variant="ghost" size="sm" leftIcon={<Link2 className="h-3.5 w-3.5" />}>
                  Manage Accounts
                </Button>
              </Link>
            </div>

            {loadingAccounts ? (
              <div className="mt-4 flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-6 text-center">
                <p className="text-sm font-medium text-ink-700">No social accounts connected</p>
                <p className="mt-1 text-xs text-ink-400">
                  Connect a LinkedIn or YouTube account first before creating a post.
                </p>
                <Link to="/app/accounts" className="mt-3 inline-block">
                  <Button variant="secondary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                    Connect Account
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {accounts.map((acc) => {
                  const platformKey = backendPlatformToKey(acc.platform);
                  const p = platforms.find((x) => x.key === platformKey);
                  const isSelected = selectedAccountIds.includes(acc.id);

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => toggleAccount(acc.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${isSelected
                          ? 'border-brand-300 bg-brand-50/40 ring-2 ring-brand-500/10'
                          : 'border-ink-100 hover:border-ink-200 hover:bg-ink-50/50'
                        }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${p?.bg || 'bg-ink-50'
                          } ${p?.color || 'text-ink-600'}`}
                      >
                        <PlatformIcon platform={platformKey} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-ink-900 truncate">
                            {acc.account_name || acc.platform}
                          </p>
                        </div>
                        <p className="text-xs text-ink-400 capitalize">{acc.platform}</p>
                      </div>
                      <div
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${isSelected
                            ? 'border-brand-600 bg-brand-600 text-white'
                            : 'border-ink-300 bg-white'
                          }`}
                      >
                        {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          {/* YouTube specific fields (conditional) */}
          {hasYouTube && (
            <Card className="border-red-100 bg-red-50/20 p-6">
              <div className="flex items-center gap-2.5">
                <Video className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="text-base font-semibold text-ink-900">YouTube Video Details</h3>
                  <p className="text-xs text-ink-400">Settings specific to your selected YouTube channel.</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-medium text-ink-600">Video title (for YouTube)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter YouTube video title"
                    className="mt-1.5 w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-ink-600">Video URL (for YouTube)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://example.com/video.mp4"
                    className="mt-1.5 w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
                  />
                  <p className="mt-1 text-xs text-ink-400">
                    Provide a direct publicly accessible MP4 video URL for YouTube publishing.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Content editor */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-ink-700" />
              <h3 className="text-base font-semibold text-ink-900">
                {hasYouTube ? 'Content / Description' : 'Post Content'}
              </h3>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                hasYouTube
                  ? 'What do you want to share? (Used as LinkedIn post & YouTube description)'
                  : 'What do you want to share?'
              }
              rows={6}
              className="mt-4 w-full resize-none rounded-xl border border-ink-100 bg-ink-50/30 p-4 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-ink-400">
              <span>{content.length} characters</span>
              <span>Required for all platforms</span>
            </div>
          </Card>

          {/* Scheduling */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <Calendar className="h-5 w-5 text-ink-700" />
              <h3 className="text-base font-semibold text-ink-900">Schedule (Optional)</h3>
            </div>
            <p className="mt-0.5 text-xs text-ink-400">
              Pick a date and time to schedule this post for later. Leave empty to publish immediately.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-ink-500">Date</label>
                <div className="relative mt-1.5">
                  <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full rounded-xl border border-ink-100 bg-ink-50/30 py-2.5 pl-10 pr-3 text-sm text-ink-700 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-500">Time</label>
                <div className="relative mt-1.5">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full rounded-xl border border-ink-100 bg-ink-50/30 py-2.5 pl-10 pr-3 text-sm text-ink-700 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {scheduledDate && scheduledTime && (
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={submitting}
                onClick={() => handleSubmit(true)}
                leftIcon={<Send className="h-4 w-4" />}
              >
                {submitting ? 'Publishing...' : 'Publish Now Instead'}
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={submitting}
              onClick={() => handleSubmit(false)}
              leftIcon={
                submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : scheduledDate && scheduledTime ? (
                  <Calendar className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )
              }
            >
              {submitting
                ? 'Submitting...'
                : scheduledDate && scheduledTime
                  ? 'Schedule Post'
                  : 'Publish Now'}
            </Button>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-ink-400" />
              <h3 className="text-sm font-semibold text-ink-700">Live Preview</h3>
            </div>

            {/* Preview cards for selected platforms */}
            {selectedAccounts.length === 0 ? (
              <Card className="p-6">
                <EmptyState
                  compact
                  icon={<Plus className="h-6 w-6" />}
                  title="Select an account"
                  description="Choose target accounts to see how your post will look."
                />
              </Card>
            ) : (
              <div className="space-y-4">
                {selectedAccounts.map((acc) => {
                  const platformKey = backendPlatformToKey(acc.platform);
                  const p = platforms.find((x) => x.key === platformKey);
                  const isYouTubeAcc = platformKey === 'youtube';

                  return (
                    <Card key={acc.id} className="overflow-hidden">
                      <div className="flex items-center justify-between border-b border-ink-100 p-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${p?.bg || 'bg-ink-50'
                              } ${p?.color || 'text-ink-700'}`}
                          >
                            <PlatformIcon platform={platformKey} className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-ink-900">{acc.account_name}</span>
                            <span className="ml-1.5 text-xs text-ink-400 capitalize">({acc.platform})</span>
                          </div>
                        </div>
                        {scheduledDate && scheduledTime && (
                          <Badge variant="brand" size="sm">
                            {scheduledDate} {scheduledTime}
                          </Badge>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        {isYouTubeAcc && (
                          <div className="rounded-lg bg-ink-50 p-2.5 text-xs">
                            <p className="font-semibold text-ink-800">
                              Title: <span className="font-normal text-ink-600">{title || '(Untitled Video)'}</span>
                            </p>
                            {videoUrl && (
                              <p className="mt-1 font-semibold text-ink-800 truncate">
                                Video: <span className="font-normal text-brand-600">{videoUrl}</span>
                              </p>
                            )}
                          </div>
                        )}

                        {content ? (
                          <p className="text-sm leading-relaxed text-ink-700 whitespace-pre-wrap">
                            {content}
                          </p>
                        ) : (
                          <p className="text-sm text-ink-300">Your content preview will appear here...</p>
                        )}

                        {isYouTubeAcc && videoUrl ? (
                          <div className="flex h-28 items-center justify-center rounded-xl bg-ink-900 text-white">
                            <Video className="h-8 w-8 text-white/60" />
                          </div>
                        ) : (
                          <div className="mt-4 h-24 rounded-xl border-2 border-dashed border-ink-100 bg-ink-50/30 flex items-center justify-center">
                            <span className="text-xs text-ink-400">Preview Area</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
