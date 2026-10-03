/* ============================================================
   CENTRALIZED TYPES FOR SOCIALPILOT PLATFORM
============================================================ */

export type Role = "Administrator" | "Marketing Team" | "Content Creator" | "Business User";

export type Platform = "linkedin" | "instagram" | "facebook" | "twitter" | "youtube" | "pinterest";

export type ContentType = "text" | "image" | "video" | "carousel" | "stories" | "reels";

export type PostStatus =
  | "draft"
  | "scheduled"
  | "published"
  | "failed"
  | "cancelled"
  | "pending_approval";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "active"
  | "completed"
  | "paused"
  | "cancelled";

export interface User {
  user_id: number;
  name: string;
  email: string;
  role: Role | string;
  created_at?: string;
  avatar?: string;
}

export interface SocialAccount {
  id: number;
  platform: Platform | string;
  account_name: string;
  username: string;
  status: "connected" | "disconnected" | "syncing" | "expired";
  followers: number | string;
  last_synced?: string;
  avatar?: string;
  mode?: "sandbox" | "live";
  is_live?: boolean;
}

export interface Post {
  id: number;
  content: string;
  platforms: (Platform | string)[];
  content_type: ContentType;
  status: PostStatus;
  scheduled_at: string | null;
  created_at?: string;
  campaign?: string;
  author?: string;
  media_url?: string | null;
  likes?: number;
  comments?: number;
  shares?: number;
  error_message?: string;
}

export interface Campaign {
  id: number;
  name: string;
  platform?: string;
  description?: string;
  objective?: string;
  status?: CampaignStatus | string;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number;
  spent?: number;
  target_reach?: number;
  target_engagement?: number;
  target_clicks?: number;
  actual_reach?: number;
  actual_engagement?: number;
  actual_clicks?: number;
  roi?: number;
  created_at?: string | null;
}

export interface QueueItem {
  id: number;
  position: number;
  post_content: string;
  platform: Platform | string;
  content_type: ContentType;
  scheduled_time: string;
  status: "pending" | "processing" | "published" | "failed" | "retry" | "cancelled";
  retry_count: number;
  campaign?: string;
}

export interface PublishingLog {
  id: number;
  post_id: number;
  post_content: string;
  platform: Platform | string;
  timestamp: string;
  status: "success" | "failed" | "retrying";
  response_code: number;
  response_payload?: string;
  error_details?: string;
  retry_count: number;
  campaign?: string;
}

export interface AnalyticsMetrics {
  total_engagement: number;
  total_reach: number;
  total_impressions: number;
  total_clicks: number;
  engagement_rate: number;
  follower_growth: number;
  total_posts: number;
  average_roi: number;
}

export interface AudienceMetrics {
  total_followers: number;
  follower_growth_pct: number;
  weekly_active_engagers: number;
  active_ratio_pct: number;
  gender_split: { male: number; female: number };
  mobile_app_pct: number;
  top_countries: { country: string; flag: string; count: string; pct: number }[];
  age_brackets: { bracket: string; pct: number }[];
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: "scheduled_reminder" | "publishing_success" | "publishing_failure" | "campaign_alert" | "team_collaboration";
  timestamp: string;
  read: boolean;
  action_url?: string;
}

export interface ReportConfig {
  report_type: "engagement" | "campaign" | "audience_growth" | "publishing" | "platform_comparison";
  date_range: "7d" | "30d" | "90d" | "1y";
  platform_filter?: string;
  campaign_filter?: string;
}
