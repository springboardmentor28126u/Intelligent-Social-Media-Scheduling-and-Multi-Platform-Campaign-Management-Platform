import type { PlatformKey } from '@/components/common/PlatformIcons';

export interface PostPlatformOut {
  id: number;
  social_account_id: number;
  platform: string;
  status: string;
  published_at?: string | null;
  external_post_id?: string | null;
  error_message?: string | null;
}

export interface PostOut {
  id: number;
  title?: string | null;
  content: string;
  media_urls?: string[] | null;
  post_as_short?: boolean;
  scheduled_time?: string | null;
  status: string;
  created_at: string;
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | null;
  recurrence_end_date?: string | null;
  platform_posts: PostPlatformOut[];
  campaign_id?: number | null;
}

export interface PublishLogOut {
  id: number;
  platform: string;
  event: 'attempt' | 'success' | 'failure' | string;
  message?: string | null;
  created_at: string;
}

export type PostAction = 'draft' | 'schedule' | 'publish_now';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly';

export function backendPlatformToKey(backendPlatform: string): PlatformKey {
  const normalized = backendPlatform.toLowerCase();
  if (normalized.includes('linkedin')) return 'linkedin';
  if (normalized.includes('youtube')) return 'youtube';
  if (normalized.includes('instagram')) return 'instagram';
  if (normalized.includes('facebook')) return 'facebook';
  if (normalized === 'x' || normalized.includes('twitter')) return 'x';
  return normalized as PlatformKey;
}

export function getPostStatusBadgeVariant(
  status: string
): 'brand' | 'neutral' | 'success' | 'warning' | 'danger' {
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

export function getPlatformStatusBadgeVariant(
  status: string
): 'brand' | 'neutral' | 'success' | 'warning' | 'danger' {
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

export function formatDateTime(dateStr: string | null | undefined): string {
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

export function toLocalISOStringWithOffset(dateStr: string, timeStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  const d = new Date(year, month - 1, day, hours, minutes, 0);

  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffsetMinutes / 60)).padStart(2, '0');
  const offsetMins = String(absOffsetMinutes % 60).padStart(2, '0');
  const tzString = `${sign}${offsetHours}:${offsetMins}`;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${tzString}`;
}

export function toEndDateISOWithOffset(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day, 23, 59, 59);

  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absOffsetMinutes = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absOffsetMinutes / 60)).padStart(2, '0');
  const offsetMins = String(absOffsetMinutes % 60).padStart(2, '0');
  const tzString = `${sign}${offsetHours}:${offsetMins}`;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}T23:59:59${tzString}`;
}
