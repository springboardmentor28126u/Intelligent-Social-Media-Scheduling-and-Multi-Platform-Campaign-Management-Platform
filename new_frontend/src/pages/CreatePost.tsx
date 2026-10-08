import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
  PenSquare,
  ArrowLeft,
  Repeat,
  Sparkles,
  Save,
  Upload,
  Trash2,
  Film,
  Check,
  FolderKanban,
  Image as ImageIcon,
  Search,
  X,
  ExternalLink,
  HardDrive,
  Globe,
} from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import Card from '@/components/common/Card';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import EmptyState from '@/components/common/EmptyState';
import { platforms, PlatformIcon } from '@/components/common/PlatformIcons';
import {
  type PostOut,
  type PostAction,
  type RecurrencePattern,
  backendPlatformToKey,
  toLocalISOStringWithOffset,
  toEndDateISOWithOffset,
} from '@/types/post';
import type { CampaignOut } from '@/types/campaign';
import type { MediaItem } from '@/types/media';
import { getCampaigns } from '@/services/campaigns';
import { getMediaList, resolveMediaUrl, handleMediaError } from '@/services/media';
import { generateCaption, type AITone, type GeneratedPost } from '@/lib/ai';

const AI_SUPPORTED_PLATFORMS = ['linkedin', 'youtube', 'instagram', 'facebook'] as const;

const AI_TONE_OPTIONS: { value: AITone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual', label: 'Casual' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'witty', label: 'Witty' },
  { value: 'inspirational', label: 'Inspirational' },
];

const API_BASE = 'http://localhost:8000';

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

type UploadedMediaType = 'image' | 'video';

function getMediaTypeFromUrl(url?: string): UploadedMediaType {
  if (!url || typeof url !== 'string') return 'image';
  const cleanUrl = url.split('?')[0];
  const extension = cleanUrl.split('.').pop()?.toLowerCase() || '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif'].includes(extension) ? 'image' : 'video';
}

interface SocialAccountData {
  id: number;
  platform: string;
  account_name: string;
  status: string;
}

export default function CreatePost() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  const locationState = location.state as
    | { editPost?: PostOut; initialVideoUrl?: string; initialMediaUrl?: string; initialCampaignId?: number }
    | undefined;
  const editPost = locationState?.editPost;
  const isEditMode = Boolean(editPost);

  // Status check: Only "draft" and "scheduled" posts can be edited
  const isStatusEditable =
    !isEditMode ||
    editPost?.status?.toLowerCase() === 'draft' ||
    editPost?.status?.toLowerCase() === 'scheduled';

  const [accounts, setAccounts] = useState<SocialAccountData[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Campaigns list and selected campaign state
  const [campaigns, setCampaigns] = useState<CampaignOut[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | ''>(() => {
    if (editPost?.campaign_id !== undefined && editPost.campaign_id !== null) {
      return editPost.campaign_id;
    }
    if (locationState?.initialCampaignId) {
      return locationState.initialCampaignId;
    }
    return '';
  });

  // Intent / Action selection: 'draft' | 'schedule' | 'publish_now'
  const [action, setAction] = useState<PostAction>(() => {
    if (editPost) {
      return editPost.status.toLowerCase() === 'draft' ? 'draft' : 'schedule';
    }
    return 'schedule';
  });

  // Selected social accounts
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>(() => {
    if (editPost?.platform_posts && editPost.platform_posts.length > 0) {
      return editPost.platform_posts.map((pp) => pp.social_account_id);
    }
    return [];
  });

  const [content, setContent] = useState(editPost?.content || '');
  const [title, setTitle] = useState(editPost?.title || '');
  const [videoUrl, setVideoUrl] = useState<string>(
    editPost?.media_urls?.[0] || locationState?.initialVideoUrl || (locationState as any)?.initialMediaUrl || ''
  );

  // Sync initial media URL if navigated to CreatePost with state
  useEffect(() => {
    const initUrl = locationState?.initialMediaUrl || locationState?.initialVideoUrl;
    if (initUrl && !videoUrl) {
      setVideoUrl(initUrl);
      const mType = getMediaTypeFromUrl(initUrl);
      setUploadedMediaType(mType);
      const fname = initUrl.split('/').pop()?.split('?')[0] || (mType === 'image' ? 'Image asset' : 'Video asset');
      setUploadedVideoMeta({
        filename: fname,
        media_type: mType,
      });
    }
  }, [locationState?.initialMediaUrl, locationState?.initialVideoUrl]);

  // AI Generation State
  const [aiTopic, setAiTopic] = useState(editPost?.title || '');
  const [aiTone, setAiTone] = useState<AITone>('professional');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [generatedPosts, setGeneratedPosts] = useState<Record<string, GeneratedPost> | null>(null);
  const [activeGeneratedPlatform, setActiveGeneratedPlatform] = useState<string | null>(null);
  const [uploadedMediaType, setUploadedMediaType] = useState<UploadedMediaType | null>(() =>
    videoUrl ? getMediaTypeFromUrl(videoUrl) : null
  );
  const [uploadedVideoMeta, setUploadedVideoMeta] = useState<{
    filename: string;
    size_bytes?: number;
    media_type: UploadedMediaType;
  } | null>(() => {
    if (videoUrl) {
      const mType = getMediaTypeFromUrl(videoUrl);
      return {
        filename: videoUrl.split('/').pop()?.split('?')[0] || (mType === 'image' ? 'Image asset' : 'Video asset'),
        media_type: mType,
      };
    }
    return null;
  });
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [postAsShort, setPostAsShort] = useState(Boolean(editPost?.post_as_short));
  const [shortsError, setShortsError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Media Library Picker & URL Input State
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [libraryMedia, setLibraryMedia] = useState<MediaItem[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<'all' | 'image' | 'video'>('all');
  const [librarySearch, setLibrarySearch] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState('');

  const fetchLibraryItems = async () => {
    if (!token) return;
    setLoadingLibrary(true);
    try {
      const data = await getMediaList({
        media_type: libraryFilter === 'all' ? undefined : libraryFilter,
        search: librarySearch.trim() || undefined,
      });
      setLibraryMedia(data.items || []);
    } catch (err) {
      console.error('Failed to load media library items:', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    if (showMediaPicker) {
      fetchLibraryItems();
    }
  }, [showMediaPicker, libraryFilter]);

  useEffect(() => {
    if (showMediaPicker) {
      const timer = setTimeout(() => {
        fetchLibraryItems();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [librarySearch]);

  const handleSelectFromLibrary = (item: MediaItem) => {
    setVideoUrl(item.file_url);
    const mType = item.media_type as UploadedMediaType;
    setUploadedMediaType(mType);
    setUploadedVideoMeta({
      filename: item.original_filename,
      size_bytes: item.size_bytes,
      media_type: mType,
    });
    setShowMediaPicker(false);
    setUploadError(null);
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    const url = customUrlInput.trim();
    const mediaType = getMediaTypeFromUrl(url);
    setVideoUrl(url);
    setUploadedMediaType(mediaType);
    setUploadedVideoMeta({
      filename: url.split('/').pop()?.split('?')[0] || (mediaType === 'image' ? 'Image URL' : 'Video URL'),
      media_type: mediaType,
    });
    setShowUrlInput(false);
    setCustomUrlInput('');
    setUploadError(null);
  };

  const handleFileUpload = async (file: File) => {
    if (!token) {
      setUploadError('You must be logged in to upload media files.');
      return;
    }

    const allowedExts = ['.mp4', '.mov', '.avi', '.webm', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setUploadError(
        `Unsupported file type "${ext}". Allowed types: .mp4, .mov, .avi, .webm, .jpg, .jpeg, .png, .gif, .webp, .bmp, .svg, .avif`
      );
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setUploadError('File exceeds maximum size limit of 200MB.');
      return;
    }

    const isImageExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif'].includes(ext);
    const mediaType: UploadedMediaType = isImageExt ? 'image' : 'video';

    // Instant local preview
    const localBlobUrl = URL.createObjectURL(file);
    setVideoUrl(localBlobUrl);
    setUploadedMediaType(mediaType);
    setUploadedVideoMeta({
      filename: file.name,
      size_bytes: file.size,
      media_type: mediaType,
    });

    setUploadingVideo(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/media/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setUploadError(data.detail || 'Failed to upload media.');
        URL.revokeObjectURL(localBlobUrl);
        setVideoUrl('');
        setUploadedMediaType(null);
        setUploadedVideoMeta(null);
        return;
      }

      const fileUrl = data.file_url || data.url || '';
      URL.revokeObjectURL(localBlobUrl);
      setVideoUrl(fileUrl);
      setUploadedMediaType(data.media_type || mediaType);
      setUploadedVideoMeta({
        filename: data.original_filename || file.name,
        size_bytes: data.size_bytes || file.size,
        media_type: data.media_type || mediaType,
      });
    } catch (err: any) {
      console.error('Error uploading media:', err);
      URL.revokeObjectURL(localBlobUrl);
      setVideoUrl('');
      setUploadedMediaType(null);
      setUploadedVideoMeta(null);
      setUploadError(err.message || 'An error occurred during media upload.');
    } finally {
      setUploadingVideo(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isStatusEditable) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isStatusEditable) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleRemoveVideo = () => {
    setVideoUrl('');
    setUploadedMediaType(null);
    setUploadedVideoMeta(null);
    setPostAsShort(false);
    setShortsError(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Parse initial scheduled date & time if editing
  const getInitialSchedule = () => {
    if (!editPost?.scheduled_time) return { date: '', time: '' };
    try {
      const d = new Date(editPost.scheduled_time);
      if (isNaN(d.getTime())) return { date: '', time: '' };
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
      };
    } catch {
      return { date: '', time: '' };
    }
  };

  const initialSchedule = getInitialSchedule();
  const [scheduledDate, setScheduledDate] = useState(initialSchedule.date);
  const [scheduledTime, setScheduledTime] = useState(initialSchedule.time);

  // Recurring post states
  const [isRecurring, setIsRecurring] = useState<boolean>(Boolean(editPost?.is_recurring));
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>(
    (editPost?.recurrence_pattern as RecurrencePattern) || 'weekly'
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>(() => {
    if (!editPost?.recurrence_end_date) return '';
    try {
      const d = new Date(editPost.recurrence_end_date);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
    } catch {
      return '';
    }
  });

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
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data: SocialAccountData[] = await response.json();
          setAccounts(data);
          // If in create mode and accounts exist and none selected yet, default select first one
          if (!editPost && data.length > 0 && selectedAccountIds.length === 0) {
            setSelectedAccountIds([data[0].id]);
          } else if (editPost && editPost.platform_posts && editPost.platform_posts.length > 0) {
            setSelectedAccountIds(editPost.platform_posts.map((pp) => pp.social_account_id));
          }
        }
      } catch (err) {
        console.error('Failed to load social accounts:', err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchAccounts();
  }, [token, editPost]);

  useEffect(() => {
    const fetchCampaignList = async () => {
      if (!token) {
        setLoadingCampaigns(false);
        return;
      }
      try {
        const data = await getCampaigns();
        setCampaigns(data);
      } catch (err) {
        console.error('Failed to load campaigns:', err);
      } finally {
        setLoadingCampaigns(false);
      }
    };

    fetchCampaignList();
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
  const hasAttachedMedia = Boolean(videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '');
  const currentMediaType: UploadedMediaType = uploadedMediaType || (hasAttachedMedia ? getMediaTypeFromUrl(videoUrl) : 'image');
  const attachedMediaIsVideo = hasAttachedMedia && currentMediaType === 'video';
  const attachedMediaIsImage = hasAttachedMedia && currentMediaType === 'image';
  const canPostAsShort = hasYouTube && attachedMediaIsVideo;

  // Selected AI platforms from currently chosen accounts
  const selectedAiPlatforms = Array.from(
    new Set(
      selectedAccounts
        .map((a) => backendPlatformToKey(a.platform))
        .filter((p) => (AI_SUPPORTED_PLATFORMS as readonly string[]).includes(p))
    )
  );

  const isTopicValid = aiTopic.trim().length >= 3;
  const hasSupportedPlatforms = selectedAiPlatforms.length > 0;
  const canGenerateAI = isTopicValid && hasSupportedPlatforms && isStatusEditable && !aiLoading;

  let aiValidationHint: string | null = null;
  if (!hasSupportedPlatforms && !isTopicValid) {
    aiValidationHint = 'Select at least one supported target account (LinkedIn, YouTube, Instagram, Facebook) and enter a topic (min 3 characters).';
  } else if (!hasSupportedPlatforms) {
    aiValidationHint = 'Select at least one target account (LinkedIn, YouTube, Instagram, Facebook) to generate captions.';
  } else if (!isTopicValid) {
    aiValidationHint = 'Topic must be at least 3 characters long.';
  }

  const handleGenerateAI = async () => {
    if (!canGenerateAI) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const result = await generateCaption(aiTopic.trim(), selectedAiPlatforms, aiTone);
      const posts = result.posts;
      setGeneratedPosts(posts);

      const availablePlatforms = Object.keys(posts);
      if (availablePlatforms.length > 0) {
        const firstPlatform = selectedAiPlatforms.find((p) => posts[p]) || availablePlatforms[0];
        setActiveGeneratedPlatform(firstPlatform);

        const firstPost = posts[firstPlatform];
        if (firstPost) {
          const applyPost = () => {
            setContent(firstPost.text);
            if (firstPost.title && (firstPlatform === 'youtube' || hasYouTube)) {
              setTitle(firstPost.title);
            }
          };

          if (content.trim()) {
            if (window.confirm('Replace your current text?')) {
              applyPost();
            }
          } else {
            applyPost();
          }
        }
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      setAiError(err.message || 'AI generation failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSelectGeneratedPlatform = (platformKey: string) => {
    if (!generatedPosts || !generatedPosts[platformKey]) return;
    setActiveGeneratedPlatform(platformKey);
    const post = generatedPosts[platformKey];

    const applyPost = () => {
      setContent(post.text);
      if (post.title && (platformKey === 'youtube' || hasYouTube)) {
        setTitle(post.title);
      }
    };

    if (content.trim() && content.trim() !== post.text) {
      if (window.confirm('Replace your current text?')) {
        applyPost();
      }
    } else {
      applyPost();
    }
  };

  const handleSubmit = async (overrideAction?: PostAction) => {
    setError(null);
    setShortsError(null);
    const effectiveAction = overrideAction || action;

    if (!isStatusEditable) {
      setError(
        `Cannot edit post with status "${editPost?.status}". Only "draft" and "scheduled" posts can be edited.`
      );
      return;
    }

    if (!content.trim()) {
      setError('Post content is required.');
      return;
    }

    if (!token) {
      setError('You must be logged in to submit a post.');
      return;
    }

    let scheduled_time: string | null = null;
    let postIsRecurring = false;
    let postRecurrencePattern: RecurrencePattern | null = null;
    let postRecurrenceEndDate: string | null = null;

    // Enforce action-specific validation matching backend rules
    if (effectiveAction === 'draft') {
      // Draft: no scheduled_time or social_account_ids required. is_recurring is false.
      scheduled_time = null;
      postIsRecurring = false;
      postRecurrencePattern = null;
      postRecurrenceEndDate = null;
    } else if (effectiveAction === 'schedule') {
      // Schedule: REQUIRES at least one social_account_id AND scheduled_time
      if (selectedAccountIds.length === 0) {
        setError('Please select at least one connected social account to schedule this post.');
        return;
      }
      if (!scheduledDate || !scheduledTime) {
        setError('Please provide both a date and time to schedule this post.');
        return;
      }

      try {
        scheduled_time = toLocalISOStringWithOffset(scheduledDate, scheduledTime);
      } catch {
        setError('Invalid schedule date or time format.');
        return;
      }

      if (isRecurring) {
        postIsRecurring = true;
        postRecurrencePattern = recurrencePattern || 'weekly';
        if (recurrenceEndDate) {
          try {
            postRecurrenceEndDate = toEndDateISOWithOffset(recurrenceEndDate);
          } catch {
            setError('Invalid recurrence end date format.');
            return;
          }
        }
      }
    } else if (effectiveAction === 'publish_now') {
      // Publish Now: REQUIRES at least one social_account_id, no scheduled_time, is_recurring is false
      if (selectedAccountIds.length === 0) {
        setError('Please select at least one connected social account to publish immediately.');
        return;
      }
      scheduled_time = null;
      postIsRecurring = false;
      postRecurrencePattern = null;
      postRecurrenceEndDate = null;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, any> = {
        title: hasYouTube && title.trim() ? title.trim() : null,
        content: content.trim(),
        media_urls: videoUrl.trim() ? [videoUrl.trim()] : null,
        post_as_short: canPostAsShort && postAsShort,
        scheduled_time,
        social_account_ids: selectedAccountIds,
        action: effectiveAction,
        is_recurring: postIsRecurring,
        recurrence_pattern: postRecurrencePattern,
        recurrence_end_date: postRecurrenceEndDate,
        campaign_id: selectedCampaignId !== '' ? Number(selectedCampaignId) : null,
      };

      const url = isEditMode ? `${API_BASE}/posts/${editPost!.id}` : `${API_BASE}/posts/`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data.detail || `Failed to ${isEditMode ? 'update' : 'create'} post. Please try again.`;
        if (typeof detail === 'string' && detail.toLowerCase().includes('not eligible for youtube shorts')) {
          setShortsError(detail);
        }
        setError(detail);
        return;
      }

      navigate('/app/calendar', { state: { justCreated: !isEditMode, justUpdated: isEditMode } });
    } catch (err: any) {
      console.error('Error submitting post:', err);
      setError(
        err.message ||
          `An unexpected error occurred while ${isEditMode ? 'updating' : 'creating'} the post.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-5 sm:p-6 lg:p-8">
      <PageHeader
        title={isEditMode ? 'Edit Post' : 'Create Post'}
        description={
          isEditMode
            ? 'Update your post content, target accounts, schedule time, or recurrence.'
            : 'Compose your content, choose an action (Draft, Schedule, or Publish Now), and manage platforms.'
        }
        action={
          isEditMode ? (
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate(-1)}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
            >
              Back
            </Button>
          ) : undefined
        }
      />

      {!isStatusEditable && (
        <div className="flex items-center gap-3 rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
          <AlertCircle className="h-5 w-5 shrink-0 text-warning-600" />
          <span>
            This post currently has status <strong>"{editPost?.status}"</strong>. Only posts with status{' '}
            <strong>"draft"</strong> or <strong>"scheduled"</strong> can be edited.
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700">
          <AlertCircle className="h-5 w-5 shrink-0 text-danger-600" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Editor Column */}
        <div className="space-y-6">
          {/* Post Intent / Action Segmented Selector */}
          <Card className="p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-400">
              Publishing Intent
            </h3>
            <p className="mt-0.5 text-xs text-ink-500">
              Select how you want this post to be handled by SocialPilot.
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {/* Draft button */}
              <button
                type="button"
                disabled={!isStatusEditable}
                onClick={() => setAction('draft')}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                  action === 'draft'
                    ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-xs'
                    : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50/50'
                } ${!isStatusEditable ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      action === 'draft' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-ink-900">Save as Draft</span>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-400">
                  Save content without scheduling. Accounts optional.
                </p>
              </button>

              {/* Schedule button */}
              <button
                type="button"
                disabled={!isStatusEditable}
                onClick={() => setAction('schedule')}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                  action === 'schedule'
                    ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-xs'
                    : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50/50'
                } ${!isStatusEditable ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      action === 'schedule' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600'
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-ink-900">Schedule for Later</span>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-400">
                  Auto-publish at a specific date/time. Recurrence available.
                </p>
              </button>

              {/* Publish Now button */}
              <button
                type="button"
                disabled={!isStatusEditable}
                onClick={() => setAction('publish_now')}
                className={`flex flex-col items-start rounded-xl border p-3 text-left transition-all ${
                  action === 'publish_now'
                    ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-500/20 shadow-xs'
                    : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50/50'
                } ${!isStatusEditable ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                      action === 'publish_now' ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-semibold text-ink-900">Publish Now</span>
                </div>
                <p className="mt-1.5 text-[11px] text-ink-400">
                  Publish to connected accounts immediately.
                </p>
              </button>
            </div>
          </Card>

          {/* Target Social Accounts */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-ink-900">Target Accounts</h3>
                  {action === 'draft' ? (
                    <Badge variant="neutral" size="sm">Optional for Draft</Badge>
                  ) : (
                    <Badge variant="brand" size="sm">Required</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink-400">
                  {action === 'draft'
                    ? 'Select target accounts now or choose them later when scheduling.'
                    : 'Select which connected social channels to publish to.'}
                </p>
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
                  Connect a LinkedIn or YouTube account to publish your posts.
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
                      disabled={!isStatusEditable}
                      onClick={() => toggleAccount(acc.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? 'border-brand-300 bg-brand-50/40 ring-2 ring-brand-500/10'
                          : 'border-ink-100 hover:border-ink-200 hover:bg-ink-50/50'
                      } ${!isStatusEditable ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          p?.bg || 'bg-ink-50'
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
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected
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

          {/* YouTube specific title field (conditional: only when YouTube account selected) */}
          {hasYouTube && (
            <Card className="border-red-100 bg-red-50/20 p-6">
              <div className="flex items-center gap-2.5">
                <Video className="h-5 w-5 text-red-600" />
                <div>
                  <h3 className="text-base font-semibold text-ink-900">YouTube Video Title</h3>
                  <p className="text-xs text-ink-400">YouTube requires a title for all video uploads.</p>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-xs font-medium text-ink-600">Video title (required for YouTube)</label>
                <input
                  type="text"
                  disabled={!isStatusEditable}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter YouTube video title"
                  className="mt-1.5 w-full rounded-xl border border-ink-100 bg-white px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 disabled:bg-ink-50 disabled:text-ink-400"
                />
              </div>
            </Card>
          )}

          {/* Media Attachment for all selected platforms (LinkedIn, YouTube, etc.) or Drafts */}
          <Card className="p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <Film className="h-5 w-5 text-ink-700" />
                <div>
                  <h3 className="text-base font-semibold text-ink-900">Attach photo or video</h3>
                  <p className="text-xs text-ink-400">
                    Upload an image or video, select from your library, or paste a media link.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {videoUrl ? (
                  <Badge variant="success" size="sm">
                    <Check className="mr-1 h-3 w-3" /> Attached ({attachedMediaIsImage ? 'Image' : 'Video'})
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm">Optional</Badge>
                )}
              </div>
            </div>

            {uploadError && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-xs text-danger-700">
                <AlertCircle className="h-4 w-4 shrink-0 text-danger-600" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              disabled={!isStatusEditable || uploadingVideo}
            />

            {/* URL input toggle if active */}
            {showUrlInput && (
              <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50/40 p-3.5 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ink-800 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-brand-600" />
                    Enter Image or Video URL
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(false)}
                    className="text-ink-400 hover:text-ink-600 text-xs"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={(e) => setCustomUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg or /media/..."
                    className="flex-1 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-800 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleApplyCustomUrl}
                    disabled={!customUrlInput.trim()}
                  >
                    Attach URL
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4">
              {uploadingVideo ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/40 py-10">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                  <div className="text-center">
                    <p className="text-sm font-semibold text-ink-900">Uploading media to server...</p>
                    <p className="mt-0.5 text-xs text-ink-400">Preview will update automatically once uploaded.</p>
                  </div>
                </div>
              ) : videoUrl ? (
                <div className="rounded-xl border border-ink-200 bg-ink-50/50 p-4 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
                        {attachedMediaIsImage ? <ImageIcon className="h-5 w-5" /> : <Film className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-900 truncate">
                          {uploadedVideoMeta?.filename || videoUrl.split('/').pop()?.split('?')[0] || (attachedMediaIsImage ? 'Uploaded image' : 'Uploaded video')}
                        </p>
                        <p className="text-xs text-ink-400">
                          {uploadedVideoMeta?.size_bytes ? formatBytes(uploadedVideoMeta.size_bytes) + ' • ' : ''}
                          <span className="capitalize">{currentMediaType}</span> attached & ready to publish
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!isStatusEditable}
                        onClick={() => fileInputRef.current?.click()}
                        leftIcon={<Upload className="h-3.5 w-3.5" />}
                      >
                        Upload New
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!isStatusEditable}
                        onClick={() => setShowMediaPicker(true)}
                        leftIcon={<HardDrive className="h-3.5 w-3.5" />}
                      >
                        Library
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={!isStatusEditable}
                        onClick={handleRemoveVideo}
                        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>

                  {/* Attached Media Preview Frame */}
                  {attachedMediaIsImage ? (
                    <div className="relative overflow-hidden rounded-xl border border-ink-200 bg-white">
                      <img
                        src={resolveMediaUrl(videoUrl)}
                        alt="Uploaded media preview"
                        className="max-h-64 w-full object-contain bg-ink-950/5"
                        onError={(e) => handleMediaError(e, videoUrl)}
                      />
                    </div>
                  ) : (
                    <div className="relative overflow-hidden rounded-xl border border-ink-200 bg-black">
                      <video
                        src={resolveMediaUrl(videoUrl)}
                        controls
                        className="max-h-64 w-full object-contain"
                        preload="metadata"
                        onError={(e) => handleMediaError(e, videoUrl)}
                      />
                    </div>
                  )}

                  {hasYouTube && attachedMediaIsImage && (
                    <div className="flex items-start gap-2 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-xs text-warning-800">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning-600" />
                      <span>
                        YouTube posts require a video &mdash; this image will only be used for other selected platforms (LinkedIn, Instagram, Facebook).
                      </span>
                    </div>
                  )}

                  {hasYouTube && (
                    <div className="border-t border-ink-200 pt-3">
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={postAsShort}
                          onChange={(e) => {
                            setPostAsShort(e.target.checked);
                            setShortsError(null);
                          }}
                          disabled={!isStatusEditable || !attachedMediaIsVideo}
                          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-ink-900">Post as YouTube Short</span>
                          <span className="mt-0.5 block text-xs text-ink-400">
                            {attachedMediaIsVideo
                              ? 'Video must be 3 minutes or shorter and vertical/square (not horizontal).'
                              : 'Attach a video to enable YouTube Shorts.'}
                          </span>
                        </span>
                      </label>
                      {shortsError && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-xs text-danger-700">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
                          <span>{shortsError}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => isStatusEditable && fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
                      isDragging
                        ? 'border-brand-500 bg-brand-50/60 ring-2 ring-brand-500/20'
                        : 'border-ink-200 bg-ink-50/30 hover:border-brand-300 hover:bg-brand-50/20'
                    } ${!isStatusEditable ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ink-500 shadow-sm">
                      <Upload className="h-6 w-6 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink-800">
                        Click to browse or drag and drop a photo or video
                      </p>
                      <p className="mt-1 text-xs text-ink-400">
                        JPG, PNG, WEBP, GIF, MP4, MOV, AVI, WEBM (up to 200MB)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!isStatusEditable}
                      onClick={() => setShowMediaPicker(true)}
                      leftIcon={<HardDrive className="h-3.5 w-3.5 text-brand-600" />}
                    >
                      Choose from Media Library
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={!isStatusEditable}
                      onClick={() => setShowUrlInput((prev) => !prev)}
                      leftIcon={<Globe className="h-3.5 w-3.5 text-ink-500" />}
                    >
                      {showUrlInput ? 'Hide URL Input' : 'Paste Image URL'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Generate with AI Card */}
          <Card className="p-6 border-brand-200/80 bg-gradient-to-br from-brand-50/25 via-white to-purple-50/15">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 text-white shadow-xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink-900">Generate with AI</h3>
                  <p className="text-xs text-ink-400">
                    Create platform-tailored captions using Gemini AI.
                  </p>
                </div>
              </div>
              <div className="mt-1 sm:mt-0">
                <Badge variant="brand" size="sm">
                  <Sparkles className="mr-1 h-3 w-3" /> AI Assistant
                </Badge>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                {/* Topic Input */}
                <div className="sm:col-span-2">
                  <label htmlFor="ai-topic-input" className="block text-xs font-semibold text-ink-700">
                    Topic / Key Message
                  </label>
                  <input
                    id="ai-topic-input"
                    type="text"
                    disabled={!isStatusEditable || aiLoading}
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="e.g. Launching our new student discount"
                    maxLength={500}
                    className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 disabled:bg-ink-50 disabled:text-ink-400"
                  />
                </div>

                {/* Tone Dropdown */}
                <div>
                  <label htmlFor="ai-tone-select" className="block text-xs font-semibold text-ink-700">
                    Tone
                  </label>
                  <select
                    id="ai-tone-select"
                    disabled={!isStatusEditable || aiLoading}
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value as AITone)}
                    className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-800 transition-all focus:border-brand-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/10 disabled:bg-ink-50 disabled:text-ink-400"
                  >
                    {AI_TONE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Action Button & Hint */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-1">
                <div>
                  <Button
                    id="generate-ai-btn"
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={!canGenerateAI}
                    onClick={handleGenerateAI}
                    leftIcon={
                      aiLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )
                    }
                  >
                    {aiLoading ? 'Generating...' : 'Generate with AI'}
                  </Button>
                </div>

                {aiValidationHint && (
                  <p className="text-xs text-ink-500 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                    <span>{aiValidationHint}</span>
                  </p>
                )}
              </div>

              {/* Error Alert */}
              {aiError && (
                <div
                  id="ai-error-alert"
                  className="flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50 p-3.5 text-xs text-danger-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-600" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* Generated Drafts Platform Tabs / Chips */}
              {generatedPosts && Object.keys(generatedPosts).length > 0 && (
                <div className="rounded-xl border border-brand-100 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-700">
                      Generated Drafts ({Object.keys(generatedPosts).length} platform{Object.keys(generatedPosts).length > 1 ? 's' : ''}):
                    </span>
                    <span className="text-[11px] text-ink-400">Click a platform tab to apply</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {Object.keys(generatedPosts).map((platformKey) => {
                      const platformConfig = platforms.find((x) => x.key === platformKey);
                      const isActive = activeGeneratedPlatform === platformKey;
                      return (
                        <button
                          key={platformKey}
                          id={`ai-tab-${platformKey}`}
                          type="button"
                          onClick={() => handleSelectGeneratedPlatform(platformKey)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                            isActive
                              ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-xs ring-1 ring-brand-500 font-semibold'
                              : 'border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50'
                          }`}
                        >
                          <PlatformIcon platform={platformKey as any} className="h-3.5 w-3.5" />
                          <span>{platformConfig?.name || platformKey}</span>
                          {isActive && <Check className="h-3 w-3 text-brand-600 ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-ink-400 flex items-center gap-1.5 pt-1.5 border-t border-ink-100">
                    <Sparkles className="h-3 w-3 text-brand-500 shrink-0" />
                    <span>AI-generated draft. Review before posting.</span>
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Content editor */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5">
              <FileText className="h-5 w-5 text-ink-700" />
              <h3 className="text-base font-semibold text-ink-900">
                {hasYouTube ? 'Content / Description' : 'Post Content'}
              </h3>
            </div>
            <textarea
              disabled={!isStatusEditable}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                hasYouTube
                  ? 'What do you want to share? (Used as LinkedIn post & YouTube description)'
                  : 'What do you want to share?'
              }
              rows={6}
              className="mt-4 w-full resize-none rounded-xl border border-ink-100 bg-ink-50/30 p-4 text-sm text-ink-800 placeholder:text-ink-400 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none disabled:bg-ink-50 disabled:text-ink-400"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-ink-400">
              <span>{content.length} characters</span>
              <span>Required for all post types</span>
            </div>
          </Card>

          {/* Campaign Selection (Optional) */}
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FolderKanban className="h-5 w-5 text-brand-600" />
                <div>
                  <h3 className="text-base font-semibold text-ink-900">Campaign</h3>
                  <p className="text-xs text-ink-400">
                    Optionally assign this post to a campaign for organized tracking.
                  </p>
                </div>
              </div>
              <Badge variant="neutral" size="sm">Optional</Badge>
            </div>

            <div className="mt-4">
              <select
                disabled={!isStatusEditable || loadingCampaigns}
                value={selectedCampaignId}
                onChange={(e) =>
                  setSelectedCampaignId(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full rounded-xl border border-ink-100 bg-ink-50/30 px-3.5 py-2.5 text-sm text-ink-800 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none disabled:bg-ink-50 disabled:text-ink-400"
              >
                <option value="">None (General / Unassigned)</option>
                {campaigns.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name} ({camp.status})
                  </option>
                ))}
              </select>

              {selectedCampaignId !== '' && (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-brand-50/60 p-3 text-xs text-brand-800 border border-brand-100">
                  <Sparkles className="h-4 w-4 text-brand-600 shrink-0" />
                  <span>
                    Post will be assigned to <strong>"{campaigns.find((c) => c.id === Number(selectedCampaignId))?.name || `Campaign #${selectedCampaignId}`}"</strong>.
                  </span>
                </div>
              )}
            </div>
          </Card>

          {/* Scheduling & Recurrence Options (Active when action is 'schedule') */}
          {action === 'schedule' && (
            <Card className="p-6 space-y-6">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="h-5 w-5 text-ink-700" />
                    <h3 className="text-base font-semibold text-ink-900">Schedule Date & Time</h3>
                  </div>
                  <Badge variant="brand" size="sm">Required for Schedule</Badge>
                </div>
                <p className="mt-0.5 text-xs text-ink-400">
                  Pick the exact date and time to automatically publish this post.
                </p>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-ink-600">Publish Date</label>
                    <div className="relative mt-1.5">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        type="date"
                        disabled={!isStatusEditable}
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full rounded-xl border border-ink-100 bg-ink-50/30 py-2.5 pl-10 pr-3 text-sm text-ink-700 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none disabled:bg-ink-50 disabled:text-ink-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-ink-600">Publish Time</label>
                    <div className="relative mt-1.5">
                      <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        type="time"
                        disabled={!isStatusEditable}
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full rounded-xl border border-ink-100 bg-ink-50/30 py-2.5 pl-10 pr-3 text-sm text-ink-700 transition-all focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 focus:outline-none disabled:bg-ink-50 disabled:text-ink-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recurrence section */}
              <div className="border-t border-ink-100 pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Repeat className="h-5 w-5 text-brand-600" />
                    <div>
                      <h4 className="text-sm font-semibold text-ink-900">Make this recurring</h4>
                      <p className="text-xs text-ink-400">
                        Automatically re-publish this post at recurring intervals.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      disabled={!isStatusEditable}
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-ink-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-ink-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none disabled:opacity-50" />
                  </label>
                </div>

                {isRecurring && (
                  <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/30 p-4 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-ink-700">Recurrence Frequency</label>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(['daily', 'weekly', 'monthly'] as RecurrencePattern[]).map((pattern) => (
                          <button
                            key={pattern}
                            type="button"
                            disabled={!isStatusEditable}
                            onClick={() => setRecurrencePattern(pattern)}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium capitalize transition-all ${
                              recurrencePattern === pattern
                                ? 'border-brand-600 bg-white text-brand-700 shadow-xs ring-1 ring-brand-600'
                                : 'border-ink-200 bg-white text-ink-600 hover:bg-ink-50'
                            }`}
                          >
                            {pattern}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-ink-700">
                        Repeat End Date <span className="font-normal text-ink-400">(Optional)</span>
                      </label>
                      <div className="relative mt-1.5">
                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                        <input
                          type="date"
                          disabled={!isStatusEditable}
                          value={recurrenceEndDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          className="w-full rounded-xl border border-ink-100 bg-white py-2 pl-10 pr-3 text-xs text-ink-700 transition-all focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 disabled:bg-ink-50 disabled:text-ink-400"
                        />
                      </div>
                      <p className="mt-1 text-[11px] text-ink-400">
                        Leave blank to repeat indefinitely until deleted or cancelled.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Action Submission Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {isEditMode && (
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={submitting}
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
            )}

            {/* If currently in Schedule mode, provide quick Publish Now button */}
            {action === 'schedule' && !isEditMode && (
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={submitting || !isStatusEditable}
                onClick={() => handleSubmit('publish_now')}
                leftIcon={<Send className="h-4 w-4" />}
              >
                {submitting ? 'Publishing...' : 'Publish Immediately'}
              </Button>
            )}

            {/* Primary Submit Button */}
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={submitting || !isStatusEditable}
              onClick={() => handleSubmit()}
              leftIcon={
                submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEditMode ? (
                  <PenSquare className="h-4 w-4" />
                ) : action === 'draft' ? (
                  <Save className="h-4 w-4" />
                ) : action === 'schedule' ? (
                  <Calendar className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )
              }
            >
              {submitting
                ? isEditMode
                  ? 'Saving Changes...'
                  : 'Submitting...'
                : isEditMode
                ? action === 'draft'
                  ? 'Save Draft Changes'
                  : action === 'schedule'
                  ? isRecurring
                    ? `Save Recurring (${recurrencePattern}) Schedule`
                    : 'Save Scheduled Post'
                  : 'Publish Post Now'
                : action === 'draft'
                ? 'Save as Draft'
                : action === 'schedule'
                ? isRecurring
                  ? `Schedule Recurring (${recurrencePattern})`
                  : 'Schedule Post'
                : 'Publish Now'}
            </Button>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="space-y-4">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-ink-400" />
                <h3 className="text-sm font-semibold text-ink-700">Live Preview</h3>
              </div>
              <Badge variant={action === 'draft' ? 'neutral' : action === 'schedule' ? 'brand' : 'success'}>
                {action === 'draft'
                  ? 'Draft Preview'
                  : action === 'schedule'
                  ? isRecurring
                    ? `Repeats ${recurrencePattern}`
                    : 'Scheduled'
                  : 'Instant Publish'}
              </Badge>
            </div>

            {/* Preview cards for selected platforms or generic preview when none selected */}
            {selectedAccounts.length === 0 ? (
              <Card className="overflow-hidden shadow-sm">
                <div className="flex items-center justify-between border-b border-ink-100 p-3 bg-ink-50/50">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-100 text-ink-700">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-ink-900">Post Preview</span>
                      <span className="ml-1.5 text-xs text-ink-400">(Draft / General)</span>
                    </div>
                  </div>
                  <Badge variant="neutral" size="sm">No account selected</Badge>
                </div>
                <div className="p-4 space-y-3">
                  {content ? (
                    <p className="text-sm leading-relaxed text-ink-700 whitespace-pre-wrap">
                      {content}
                    </p>
                  ) : (
                    <p className="text-sm text-ink-300 italic">Your content preview will appear here...</p>
                  )}

                  {videoUrl ? (
                    attachedMediaIsImage ? (
                      <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
                        <img
                          src={resolveMediaUrl(videoUrl)}
                          alt="Post media preview"
                          className="max-h-48 w-full object-cover"
                          onError={(e) => handleMediaError(e, videoUrl)}
                        />
                        <div className="flex items-center gap-2 bg-ink-900 px-3 py-1.5 text-xs text-ink-200">
                          <ImageIcon className="h-3.5 w-3.5 text-brand-400" />
                          <span className="truncate">{uploadedVideoMeta?.filename || videoUrl.split('/').pop()?.split('?')[0] || 'Attached Image'}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-ink-200 bg-black">
                        <video
                          src={resolveMediaUrl(videoUrl)}
                          controls
                          className="max-h-48 w-full object-contain"
                          preload="metadata"
                          onError={(e) => handleMediaError(e, videoUrl)}
                        />
                        <div className="flex items-center gap-2 bg-ink-900 px-3 py-1.5 text-xs text-ink-200">
                          <Film className="h-3.5 w-3.5 text-brand-400" />
                          <span className="truncate">{uploadedVideoMeta?.filename || videoUrl.split('/').pop()?.split('?')[0] || 'Attached Video'}</span>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="mt-2 h-14 rounded-xl border border-dashed border-ink-100 bg-ink-50/30 flex items-center justify-center">
                      <span className="text-xs text-ink-400">No media attached</span>
                    </div>
                  )}

                  <p className="text-[11px] text-ink-400 pt-1">
                    Select target accounts on the left to preview platform-specific layouts.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {selectedAccounts.map((acc) => {
                  const platformKey = backendPlatformToKey(acc.platform);
                  const p = platforms.find((x) => x.key === platformKey);
                  const isYouTubeAcc = platformKey === 'youtube';

                  return (
                    <Card key={acc.id} className="overflow-hidden shadow-sm">
                      <div className="flex items-center justify-between border-b border-ink-100 p-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                              p?.bg || 'bg-ink-50'
                            } ${p?.color || 'text-ink-700'}`}
                          >
                            <PlatformIcon platform={platformKey} className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-sm font-semibold text-ink-900">{acc.account_name}</span>
                            <span className="ml-1.5 text-xs text-ink-400 capitalize">({acc.platform})</span>
                          </div>
                        </div>
                        {action === 'schedule' && scheduledDate && scheduledTime && (
                          <div className="flex items-center gap-1.5">
                            {isRecurring && (
                              <Badge variant="accent" size="sm">
                                <Repeat className="h-3 w-3 mr-1" />
                                {recurrencePattern}
                              </Badge>
                            )}
                            <Badge variant="brand" size="sm">
                              {scheduledDate} {scheduledTime}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        {isYouTubeAcc && (
                          <div className="rounded-lg bg-ink-50 p-2.5 text-xs">
                            <p className="font-semibold text-ink-800">
                              YouTube Title: <span className="font-normal text-ink-600">{title || '(Untitled Video)'}</span>
                            </p>
                          </div>
                        )}

                        {content ? (
                          <p className="text-sm leading-relaxed text-ink-700 whitespace-pre-wrap">
                            {content}
                          </p>
                        ) : (
                          <p className="text-sm text-ink-300 italic">Your content preview will appear here...</p>
                        )}

                        {videoUrl ? (
                          attachedMediaIsImage ? (
                            <div className="overflow-hidden rounded-xl border border-ink-200 bg-white">
                              <img
                                src={resolveMediaUrl(videoUrl)}
                                alt="Post media preview"
                                className="max-h-48 w-full object-cover"
                                onError={(e) => handleMediaError(e, videoUrl)}
                              />
                              <div className="flex items-center gap-2 bg-ink-900 px-3 py-1.5 text-xs text-ink-200">
                                <ImageIcon className="h-3.5 w-3.5 text-brand-400" />
                                <span className="truncate">{uploadedVideoMeta?.filename || videoUrl.split('/').pop()?.split('?')[0] || 'Attached Image'}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="overflow-hidden rounded-xl border border-ink-200 bg-black">
                              <video
                                src={resolveMediaUrl(videoUrl)}
                                controls
                                className="max-h-48 w-full object-contain"
                                preload="metadata"
                                onError={(e) => handleMediaError(e, videoUrl)}
                              />
                              <div className="flex items-center gap-2 bg-ink-900 px-3 py-1.5 text-xs text-ink-200">
                                <Film className="h-3.5 w-3.5 text-brand-400" />
                                <span className="truncate">{uploadedVideoMeta?.filename || videoUrl.split('/').pop()?.split('?')[0] || 'Attached Video'}</span>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="mt-2 h-16 rounded-xl border border-dashed border-ink-100 bg-ink-50/30 flex items-center justify-center">
                            <span className="text-xs text-ink-400">No media attached</span>
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

      {/* Choose from Media Library Picker Modal */}
      {showMediaPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
              <div>
                <h3 className="text-base font-semibold text-ink-900">Select Media from Library</h3>
                <p className="text-xs text-ink-400">
                  Choose any uploaded image or video to attach to your post.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPicker(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col gap-3 border-b border-ink-100 bg-ink-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1.5">
                {(
                  [
                    { key: 'all', label: 'All' },
                    { key: 'image', label: 'Images' },
                    { key: 'video', label: 'Videos' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setLibraryFilter(t.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                      libraryFilter === t.key
                        ? 'bg-brand-600 text-white shadow-xs font-semibold'
                        : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  placeholder="Search files..."
                  className="w-full rounded-lg border border-ink-200 bg-white py-1.5 pl-8 pr-3 text-xs text-ink-800 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Body / Items Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              {loadingLibrary ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                  <p className="mt-3 text-xs text-ink-500 font-medium">Loading library items...</p>
                </div>
              ) : libraryMedia.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400 mb-3">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-ink-800">No media files found</p>
                  <p className="mt-1 text-xs text-ink-400 max-w-sm">
                    {librarySearch ? `No results match "${librarySearch}".` : 'Your media library is currently empty. Upload files from your computer.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {libraryMedia.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectFromLibrary(item)}
                      className="group relative cursor-pointer overflow-hidden rounded-xl border border-ink-200 bg-white p-2 transition-all hover:border-brand-500 hover:ring-2 hover:ring-brand-500/20 hover:shadow-md"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-ink-950 flex items-center justify-center">
                        {item.media_type === 'image' ? (
                          <img
                            src={resolveMediaUrl(item.file_url)}
                            alt={item.original_filename}
                            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                            onError={(e) => handleMediaError(e, item.file_url)}
                          />
                        ) : (
                          <div className="relative h-full w-full flex items-center justify-center bg-ink-900 text-brand-400">
                            <Film className="h-8 w-8" />
                          </div>
                        )}
                        <span className="absolute top-1.5 left-1.5 rounded bg-black/60 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {item.media_type.toUpperCase()}
                        </span>
                      </div>
                      <div className="mt-2 min-w-0">
                        <p className="truncate text-xs font-semibold text-ink-900 group-hover:text-brand-600">
                          {item.original_filename}
                        </p>
                        <p className="text-[10px] text-ink-400">
                          {formatBytes(item.size_bytes)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-ink-100 bg-ink-50 px-6 py-3">
              <span className="text-xs text-ink-400">
                {libraryMedia.length} file{libraryMedia.length !== 1 ? 's' : ''} available
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowMediaPicker(false)}
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

