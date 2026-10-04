export interface AdminSettings {
  allow_signups: boolean;
  require_approval: boolean;
  max_upload_size_mb: number;
  default_user_role: string;
  maintenance_mode: boolean;
  system_announcement?: string;
  allowed_platforms: string[];
  email_notifications: boolean;
}

export interface AdminStats {
  total_users: number;
  admin_count: number;
  creator_count: number;
  new_users_this_week: number;
  total_posts: number;
  scheduled_posts: number;
  published_posts: number;
  active_campaigns: number;
  connected_accounts: number;
  total_media_count: number;
  total_media_bytes: number;
}

export interface UserGrowthPoint {
  date: string;
  users: number;
}

export interface AdminAnalytics {
  stats: AdminStats;
  user_growth: UserGrowthPoint[];
  role_distribution: {
    admin: number;
    creator: number;
    [key: string]: number;
  };
  post_status_distribution: {
    published: number;
    scheduled: number;
    draft: number;
    failed: number;
  };
  platform_distribution: {
    linkedin: number;
    youtube: number;
    instagram: number;
    facebook: number;
    x: number;
    [key: string]: number;
  };
}
